"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession, getUserId } from "@/lib/supabase/server";
import { applyDeliveryOutcome } from "@/lib/delivery-ops";
import { notifyBooking } from "@/lib/notify-events";
import { TRAVELER_STEPS, type TravelerStep } from "@/lib/tracking";

const uuid = z.uuid();

/** Étape déclarée par le voyageur : parti, arrivé, colis remis au livreur (livraison à domicile). */
export async function markTravelStep(bookingId: string, step: TravelerStep) {
  const userId = await getUserId();
  if (!userId || !uuid.safeParse(bookingId).success || !(step in TRAVELER_STEPS)) return;
  const db = createAdminClient();
  const { data: b } = await db.from("bookings").select("id, status, delivery_cents, trip:trips(traveler_id)").eq("id", bookingId).maybeSingle();
  const trip = Array.isArray(b?.trip) ? b.trip[0] : b?.trip;
  if (!b || trip?.traveler_id !== userId || b.status !== "picked_up") return;
  if (step === "out_for_delivery" && !b.delivery_cents) return;

  // L'étape précédente doit déjà être enregistrée (on ne déclare pas « arrivé » avant « parti »).
  const previous = TRAVELER_STEPS[step];
  const { data: prev } = await db.from("booking_events").select("id").eq("booking_id", bookingId).eq("kind", previous).maybeSingle();
  if (!prev) return;

  await db.from("booking_events").insert({ booking_id: bookingId, kind: step });
  if (step === "out_for_delivery") await db.from("bookings").update({ delivery_status: "out_for_delivery" }).eq("id", bookingId);
  await notifyBooking(bookingId, step);
  revalidatePath(`/reservations/${bookingId}`);
}

/** Administration (ou partenaire) : issue de la livraison à domicile. « Livré » déclenche le versement au voyageur. */
export async function completeHomeDelivery(bookingId: string, outcome: "delivered" | "failed") {
  const { userId, isAdmin } = await getSession();
  if (!userId || !isAdmin) notFound();
  await applyDeliveryOutcome(bookingId, outcome);
  revalidatePath("/admin");
}
