import "server-only";

import { randomInt } from "node:crypto";
import type Stripe from "stripe";
import { requestPartnerDelivery } from "@/lib/delivery-partner";
import { notifyBooking } from "@/lib/notify-events";
import { sendRecipientCode } from "@/lib/recipient-mail";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/** Paiement encaissé par Stripe, ramené à ce qui compte pour la réservation. */
export type Payment = { bookingId: string | null; amount: number | null; currency: string | null; paymentIntentId: string | null };

export const paymentFromSession = (session: Stripe.Checkout.Session): Payment => ({
  bookingId: session.metadata?.booking_id ?? session.client_reference_id,
  amount: session.amount_total,
  currency: session.currency,
  paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
});

/**
 * Le membre revient de Stripe, ou rouvre sa réservation : on demande à Stripe si elle est payée.
 * Filet de sécurité si le webhook n'arrive pas (endpoint mal configuré, panne) ; markPaid reste idempotent.
 * Deux sources : la dernière session enregistrée, puis tout paiement réussi portant l'identifiant de la
 * réservation (le membre a pu payer une session plus ancienne avant de recliquer sur « Payer »).
 */
export async function confirmCheckout(bookingId: string) {
  if (!process.env.STRIPE_SECRET_KEY) return false;
  const { data } = await createAdminClient().from("bookings").select("stripe_checkout_session_id").eq("id", bookingId).eq("status", "accepted").maybeSingle();
  if (!data) return false;
  try {
    if (data.stripe_checkout_session_id) {
      const session = await stripe().checkout.sessions.retrieve(data.stripe_checkout_session_id);
      if ((session.payment_status === "paid" || session.payment_status === "no_payment_required") && paymentFromSession(session).bookingId === bookingId) {
        return await markPaid(paymentFromSession(session));
      }
    }
    const found = await stripe().paymentIntents.search({ query: `metadata['booking_id']:'${bookingId}' AND status:'succeeded'`, limit: 1 });
    const pi = found.data[0];
    if (!pi) {
      console.info("Paiement Stripe pas encore reçu pour la réservation", bookingId);
      return false;
    }
    return await markPaid({ bookingId, amount: pi.amount_received, currency: pi.currency, paymentIntentId: pi.id });
  } catch (e) {
    console.error("Vérification du paiement Stripe", bookingId, e instanceof Error ? e.message : e);
    return false;
  }
}

/** Réservation acceptée → payée, une seule fois : code de remise, livraison à domicile, notifications. */
export async function markPaid(payment: Payment): Promise<boolean> {
  const { bookingId } = payment;
  if (!bookingId) return false;

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, sender_id, total_cents, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return false;

  // Contrôle du montant encaissé.
  if (payment.amount !== booking.total_cents || payment.currency !== "eur") {
    console.error("Montant Stripe inattendu pour la réservation", bookingId, payment.amount, booking.total_cents);
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
      stripe_payment_intent_id: payment.paymentIntentId,
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
