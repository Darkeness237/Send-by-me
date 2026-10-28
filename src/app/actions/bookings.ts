"use server";

import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { homeDeliveryFor } from "@/lib/delivery";
import { CONTACT_BLOCKED_MESSAGE, containsContactDetails } from "@/lib/contact-guard";
import { notifyBooking, notifyMessage, notifyOffer } from "@/lib/notify-events";
import { missingPhotos, REQUIRED_BEFORE_DELIVERY, REQUIRED_BEFORE_PICKUP } from "@/lib/parcel-photos";
import { quote, roundKg } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";
import type { FormState } from "./auth";
import { getActionT } from "@/i18n/server";

const uuid = z.uuid();
const categoryIds = CATEGORIES.map((c) => c.id) as [string, ...string[]];

async function requireUser() {
  const userId = await getUserId();
  if (!userId) redirect("/connexion");
  return userId;
}

/** Charge la réservation avec le voyageur du trajet (côté serveur, sans RLS). */
async function loadBooking(bookingId: string) {
  if (!uuid.safeParse(bookingId).success) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("id, status, sender_id, trip_id, weight_kg, trip:trips(traveler_id, departure_at)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!data) return null;
  const trip = Array.isArray(data.trip) ? data.trip[0] : data.trip;
  return { ...data, traveler_id: trip?.traveler_id as string };
}

function refresh(bookingId: string) {
  revalidatePath(`/reservations/${bookingId}`);
  revalidatePath("/espace");
}

// ── Demande de réservation (expéditeur) ─────────────────────────
const requestSchema = z.object({
  trip_id: uuid,
  weight_kg: z.coerce.number().min(0.5, "0,5 kg minimum").max(300, "300 kg maximum"),
  category: z.enum(categoryIds, { error: "Choisissez un type de colis" }),
  description: z.string().trim().min(3, "Décrivez le contenu du colis").max(500),
  recipient_name: z.string().trim().min(2, "Nom du destinataire manquant").max(80),
  recipient_phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{8,20}$/, "Numéro du destinataire invalide (ex. +237 6 99 00 00 00)"),
  recipient_email: z.email("E-mail du destinataire invalide : il y recevra son code de réception").max(120),
  offer_price: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(1, "Proposition : 1 € minimum le kilo").max(100).optional()),
  declaration: z.literal("on", { error: "Confirmez que le colis ne contient aucun objet interdit" }),
  home_delivery: z.literal("on").optional(),
  delivery_address: z.string().trim().max(300).optional(),
});

export async function requestBooking(_: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: "Mode démo : connectez Supabase pour réserver." };
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous pour réserver des kilos." };

  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const admin = createAdminClient();
  const { data: trip } = await admin
    .from("trips")
    .select("id, traveler_id, status, departure_at, capacity_kg, reserved_kg, price_per_kg_cents, accepted_categories, to_country")
    .eq("id", d.trip_id)
    .maybeSingle();

  if (!trip || trip.status !== "published") return { error: "Ce trajet n'accepte plus de réservations." };
  if (trip.traveler_id === userId) return { error: "Vous ne pouvez pas réserver votre propre trajet." };
  if (new Date(trip.departure_at).getTime() < Date.now()) return { error: "Ce trajet est déjà parti." };
  if (Number(trip.capacity_kg) - Number(trip.reserved_kg) < roundKg(d.weight_kg))
    return { error: "Il ne reste plus assez de kilos sur ce trajet." };
  if (!(trip.accepted_categories as string[]).includes(d.category))
    return { error: "Ce voyageur n'accepte pas ce type de colis." };

  const wantsDelivery = d.home_delivery === "on";
  if (wantsDelivery && (d.delivery_address ?? "").length < 5) return { error: "Indiquez l'adresse de livraison du destinataire." };

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", trip.id)
    .eq("sender_id", userId)
    .in("status", ["pending", "accepted"]);
  if (count) return { error: "Vous avez déjà une demande en cours sur ce trajet." };

  // Prix recalculé ici, à partir du trajet en base. Une proposition de prix ne s'applique qu'une fois acceptée.
  const q = quote(trip.price_per_kg_cents, d.weight_kg, wantsDelivery ? homeDeliveryFor(trip.to_country) : 0);
  const offerCents = d.offer_price ? Math.round(d.offer_price * 100) : null;

  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      trip_id: trip.id,
      sender_id: userId,
      weight_kg: q.weightKg,
      category: d.category,
      description: d.description,
      recipient_name: d.recipient_name,
      recipient_phone: d.recipient_phone,
      recipient_email: d.recipient_email.toLowerCase(),
      price_per_kg_cents: trip.price_per_kg_cents,
      base_cents: q.baseCents,
      delivery_cents: q.deliveryCents,
      delivery_status: wantsDelivery ? "requested" : null,
      fee_cents: q.feeCents,
      commission_rate: q.commissionRate,
      processing_cents: q.processingCents,
      total_cents: q.totalCents,
    })
    .select("id")
    .single();

  if (error || !booking) return { error: "La demande n'a pas pu être envoyée. Réessayez." };
  if (wantsDelivery) {
    // Adresse gardée à part : seuls l'expéditeur et l'équipe (pour le partenaire de livraison) la voient.
    await admin.from("booking_deliveries").insert({ booking_id: booking.id, sender_id: userId, address: d.delivery_address });
  }
  // Crédit de parrainage : déduit des frais, au plus la commission Send By Me (la part du voyageur est intacte).
  await admin.rpc("apply_booking_credit", { p_booking_id: booking.id, p_max_cents: q.commissionCents });
  await notifyBooking(booking.id, "requested");
  if (offerCents && offerCents !== trip.price_per_kg_cents) {
    await admin.from("price_offers").insert({ booking_id: booking.id, author_id: userId, price_per_kg_cents: offerCents });
    await notifyOffer(booking.id, trip.traveler_id, "offer", offerCents);
  }
  redirect(`/reservations/${booking.id}`);
}

// ── Réponse du voyageur ─────────────────────────────────────────
export async function acceptBooking(bookingId: string) {
  const userId = await requireUser();
  const b = await loadBooking(bookingId);
  if (!b || b.traveler_id !== userId || b.status !== "pending") return;
  const admin = createAdminClient();
  const { data: accepted } = await admin.rpc("accept_booking", { p_booking_id: bookingId, p_traveler_id: userId });
  if (accepted) {
    // Le voyageur accepte au prix en vigueur : une proposition encore ouverte est close.
    await admin.from("price_offers").update({ status: "superseded", answered_at: new Date().toISOString() }).eq("booking_id", bookingId).eq("status", "pending");
    await notifyBooking(bookingId, "accepted");
  }
  refresh(bookingId);
}

export async function declineBooking(bookingId: string) {
  const userId = await requireUser();
  const b = await loadBooking(bookingId);
  if (!b || b.traveler_id !== userId) return;
  const admin = createAdminClient();
  if (b.status === "pending") {
    await admin.from("bookings").update({ status: "declined", updated_at: new Date().toISOString() }).eq("id", bookingId).eq("status", "pending");
  } else if (b.status === "accepted") {
    await admin.rpc("release_booking", { p_booking_id: bookingId, p_new_status: "declined" });
  }
  await notifyBooking(bookingId, "declined");
  refresh(bookingId);
}

// ── Annulation par l'expéditeur (avant paiement) ────────────────
export async function cancelBooking(bookingId: string) {
  const userId = await requireUser();
  const b = await loadBooking(bookingId);
  if (!b || b.sender_id !== userId) return;
  const admin = createAdminClient();
  if (b.status === "pending") {
    await admin.from("bookings").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", bookingId).eq("status", "pending");
  } else if (b.status === "accepted") {
    await admin.rpc("release_booking", { p_booking_id: bookingId, p_new_status: "cancelled" });
  }
  refresh(bookingId);
}

// ── Remise du colis au voyageur ─────────────────────────────────
export async function confirmPickup(bookingId: string) {
  const userId = await requireUser();
  const b = await loadBooking(bookingId);
  if (!b || b.traveler_id !== userId || b.status !== "paid") return;
  const admin = createAdminClient();
  // Traçabilité : photos de l'expéditeur (contenu, colis emballé) et du voyageur à la prise en charge.
  const { data: photos } = await admin.from("booking_photos").select("kind").eq("booking_id", bookingId);
  if (missingPhotos(photos ?? [], REQUIRED_BEFORE_PICKUP).length) return;
  const { data: picked } = await admin
    .from("bookings")
    .update({ status: "picked_up", updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("status", "paid")
    .select("id");
  if (picked?.length) await notifyBooking(bookingId, "picked_up");
  refresh(bookingId);
}

// ── Livraison : le voyageur saisit le code donné par le destinataire ──
const MAX_ATTEMPTS = 5;

export async function confirmDelivery(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  const bookingId = String(formData.get("booking_id") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "Le code fait 6 chiffres." };

  const b = await loadBooking(bookingId);
  if (!b || b.traveler_id !== userId || b.status !== "picked_up") return { error: "Livraison impossible pour cette réservation." };

  const admin = createAdminClient();
  const { data: photos } = await admin.from("booking_photos").select("kind").eq("booking_id", bookingId);
  if (missingPhotos(photos ?? [], REQUIRED_BEFORE_DELIVERY).length) {
    return { error: "Ajoutez d'abord la photo du colis à l'arrivée, toujours fermé." };
  }
  const { data: secret } = await admin
    .from("booking_secrets")
    .select("delivery_code, attempts")
    .eq("booking_id", bookingId)
    .single();
  if (!secret) return { error: "Code introuvable. Contactez le support." };
  if (secret.attempts >= MAX_ATTEMPTS) return { error: "Trop d'essais. Contactez le support pour débloquer la livraison." };

  const ok = timingSafeEqual(Buffer.from(code), Buffer.from(secret.delivery_code));
  if (!ok) {
    await admin.from("booking_secrets").update({ attempts: secret.attempts + 1 }).eq("booking_id", bookingId);
    const left = MAX_ATTEMPTS - secret.attempts - 1;
    const t = await getActionT();
    return { error: left > 1 ? t("Code incorrect. {n} essais restants.", { n: left }) : t("Code incorrect. {n} essai restant.", { n: left }) };
  }

  const now = new Date().toISOString();
  await admin.from("bookings").update({ status: "delivered", delivered_at: now, updated_at: now }).eq("id", bookingId).eq("status", "picked_up");
  await notifyBooking(bookingId, "delivered");
  refresh(bookingId);
  return { ok: "Réception validée : la transaction est terminée." };
}

// ── Messages (réservation ou question avant réservation) ─────────
export async function sendMessage(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  const bookingId = String(formData.get("booking_id") ?? "");
  const inquiryId = String(formData.get("inquiry_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const thread = uuid.safeParse(bookingId).success ? { booking_id: bookingId } : uuid.safeParse(inquiryId).success ? { inquiry_id: inquiryId } : null;
  if (!thread || !body) return null;
  if (body.length > 2000) return { error: "Message trop long (2000 caractères maximum)." };
  if (containsContactDetails(body)) return { error: CONTACT_BLOCKED_MESSAGE };

  // Client utilisateur : la RLS vérifie que l'auteur participe à la discussion.
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({ ...thread, author_id: userId, body });
  if (error) return { error: error.code === "23514" ? CONTACT_BLOCKED_MESSAGE : "Message non envoyé." };
  await notifyMessage("booking_id" in thread ? { bookingId } : { inquiryId }, userId, body);
  revalidatePath("booking_id" in thread ? `/reservations/${bookingId}` : `/messages/${inquiryId}`);
  revalidatePath("/messages");
  return null;
}

// ── Avis après livraison ────────────────────────────────────────
const reviewSchema = z.object({
  booking_id: uuid,
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(600).optional(),
});

export async function leaveReview(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choisissez une note de 1 à 5." };

  const b = await loadBooking(parsed.data.booking_id);
  if (!b || b.status !== "delivered") return { error: "Vous pourrez laisser un avis après la livraison." };
  const isSender = b.sender_id === userId;
  const isTraveler = b.traveler_id === userId;
  if (!isSender && !isTraveler) return { error: "Action non autorisée." };

  const admin = createAdminClient();
  const { error } = await admin.from("reviews").insert({
    booking_id: b.id,
    author_id: userId,
    subject_id: isSender ? b.traveler_id : b.sender_id,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
  });
  if (error) return { error: error.code === "23505" ? "Vous avez déjà laissé un avis." : "Avis non enregistré." };
  refresh(b.id);
  return { ok: "Merci pour votre avis." };
}
