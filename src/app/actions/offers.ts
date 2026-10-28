"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifyOffer } from "@/lib/notify-events";
import { quote } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import type { FormState } from "./auth";

const uuid = z.uuid();

/** Réservation en attente avec ses deux participants, chargée côté serveur. */
async function loadPending(bookingId: string) {
  if (!uuid.safeParse(bookingId).success) return null;
  const { data } = await createAdminClient()
    .from("bookings")
    .select("id, status, sender_id, weight_kg, delivery_cents, price_per_kg_cents, trip:trips(traveler_id, price_per_kg_cents)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!data || data.status !== "pending") return null;
  const trip = Array.isArray(data.trip) ? data.trip[0] : data.trip;
  return { ...data, traveler_id: trip?.traveler_id as string, listed: trip?.price_per_kg_cents as number };
}

/** Proposition de prix au kilo, par l'expéditeur ou (contre-proposition) par le voyageur, tant que la demande est en attente. */
export async function makeOffer(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  const bookingId = String(formData.get("booking_id") ?? "");
  const price = Number(String(formData.get("price") ?? "").replace(",", "."));
  if (!Number.isFinite(price) || price < 1 || price > 100) return { error: "Proposez un prix entre 1 € et 100 € le kilo." };
  const cents = Math.round(price * 100);

  const b = await loadPending(bookingId);
  if (!b) return { error: "La négociation n'est plus possible pour cette demande." };
  const isSender = b.sender_id === userId;
  if (!isSender && b.traveler_id !== userId) return { error: "Action non autorisée." };
  if (cents === b.price_per_kg_cents) return { error: "C'est déjà le prix en vigueur." };

  const db = createAdminClient();
  // La nouvelle proposition remplace celle qui était en attente.
  await db.from("price_offers").update({ status: "superseded", answered_at: new Date().toISOString() }).eq("booking_id", b.id).eq("status", "pending");
  const { error } = await db.from("price_offers").insert({ booking_id: b.id, author_id: userId, price_per_kg_cents: cents });
  if (error) return { error: "Proposition non envoyée. Réessayez." };
  await notifyOffer(b.id, isSender ? b.traveler_id : b.sender_id, "offer", cents);
  revalidatePath(`/reservations/${b.id}`);
  return { ok: "Proposition envoyée." };
}

/** Réponse à une proposition : seul l'autre participant peut l'accepter ou la refuser. */
export async function answerOffer(offerId: string, accept: boolean) {
  const userId = await getUserId();
  if (!userId || !uuid.safeParse(offerId).success) return;
  const db = createAdminClient();
  const { data: offer } = await db.from("price_offers").select("id, booking_id, author_id, price_per_kg_cents, status").eq("id", offerId).maybeSingle();
  if (!offer || offer.status !== "pending" || offer.author_id === userId) return;
  const b = await loadPending(offer.booking_id);
  if (!b || (b.sender_id !== userId && b.traveler_id !== userId)) return;

  const now = new Date().toISOString();
  if (accept) {
    // Montants recalculés côté serveur avec le prix convenu (la livraison à domicile ne change pas).
    const q = quote(offer.price_per_kg_cents, Number(b.weight_kg), b.delivery_cents ?? 0);
    const { data: ok } = await db.rpc("reprice_booking", {
      p_booking_id: b.id,
      p_price_cents: offer.price_per_kg_cents,
      p_base: q.baseCents,
      p_fee: q.feeCents,
      p_commission_rate: q.commissionRate,
      p_processing: q.processingCents,
    });
    if (!ok) return;
  }
  await db.from("price_offers").update({ status: accept ? "accepted" : "declined", answered_at: now }).eq("id", offer.id).eq("status", "pending");
  await notifyOffer(b.id, offer.author_id, accept ? "offer_accepted" : "offer_declined", offer.price_per_kg_cents);
  revalidatePath(`/reservations/${b.id}`);
}
