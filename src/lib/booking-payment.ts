import "server-only";

import { randomInt } from "node:crypto";
import type Stripe from "stripe";
import { requestPartnerDelivery } from "@/lib/delivery-partner";
import { notifyBooking } from "@/lib/notify-events";
import { sendRecipientCode } from "@/lib/recipient-mail";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Le membre revient de Stripe, ou rouvre sa réservation : on interroge Stripe sur la session enregistrée.
 * Filet de sécurité si le webhook n'arrive pas (endpoint mal configuré, panne) ; markPaid reste idempotent.
 */
export async function confirmCheckout(bookingId: string) {
  if (!process.env.STRIPE_SECRET_KEY) return false;
  const { data } = await createAdminClient().from("bookings").select("stripe_checkout_session_id").eq("id", bookingId).eq("status", "accepted").maybeSingle();
  const sessionId = data?.stripe_checkout_session_id;
  if (!sessionId) return false;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return false;
    if ((session.metadata?.booking_id ?? session.client_reference_id) !== bookingId) return false;
    return await markPaid(session);
  } catch (e) {
    console.error("Vérification du paiement Stripe", bookingId, e);
    return false;
  }
}

/** Réservation acceptée → payée, une seule fois : code de remise, livraison à domicile, notifications. */
export async function markPaid(session: Stripe.Checkout.Session): Promise<boolean> {
  const bookingId = session.metadata?.booking_id ?? session.client_reference_id;
  if (!bookingId) return false;

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, sender_id, total_cents, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return false;

  // Contrôle du montant encaissé.
  if (session.amount_total !== booking.total_cents || session.currency !== "eur") {
    console.error("Montant Stripe inattendu pour la réservation", bookingId);
    return false;
  }

  // Transition idempotente : ne s'applique qu'une fois, même si Stripe renvoie l'événement.
  const now = new Date().toISOString();
  const { data: updated } = await admin
    .from("bookings")
    .update({
      status: "paid",
      paid_at: now,
      updated_at: now,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
    })
    .eq("id", bookingId)
    .eq("status", "accepted")
    .select("id");

  if (updated?.length) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await admin
      .from("booking_secrets")
      .upsert({ booking_id: bookingId, sender_id: booking.sender_id, delivery_code: code, attempts: 0 }, { onConflict: "booking_id", ignoreDuplicates: true });
    await scheduleHomeDelivery(bookingId);
    await sendRecipientCode(bookingId).catch((e) => console.error("code destinataire", e));
    await notifyBooking(bookingId, "paid");
  }
  return Boolean(updated?.length);
}

/** Livraison à domicile payée : la course est demandée au partenaire (sinon l'équipe la planifie depuis l'administration). */
async function scheduleHomeDelivery(bookingId: string) {
  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select("id, tracking_code, delivery_cents, weight_kg, recipient_name, recipient_phone, trip:trips(to_city, to_country, arrival_at, departure_at)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b?.delivery_cents) return;
  const { data: d } = await admin.from("booking_deliveries").select("address").eq("booking_id", bookingId).maybeSingle();
  const trip = Array.isArray(b.trip) ? b.trip[0] : b.trip;
  if (!d || !trip) return;
  const ref = await requestPartnerDelivery({
    trackingCode: b.tracking_code,
    city: trip.to_city,
    country: trip.to_country,
    address: d.address,
    recipientName: b.recipient_name,
    recipientPhone: b.recipient_phone,
    weightKg: Number(b.weight_kg),
    expectedAt: trip.arrival_at ?? trip.departure_at,
  });
  if (ref) await admin.from("bookings").update({ delivery_status: "scheduled", delivery_partner_ref: ref }).eq("id", bookingId);
}
