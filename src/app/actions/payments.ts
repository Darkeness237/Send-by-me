"use server";

import { redirect } from "next/navigation";
import { SITE_URL } from "@/lib/env";
import { codeFor } from "@/lib/places";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

// Libellé de suivi des sessions Checkout dans le Dashboard Stripe.
const INTEGRATION_ID = "sendbyme-booking-qhzvtmke";

/** Crée une session Checkout pour une réservation acceptée. Le montant vient de la base, jamais du client. */
export async function startCheckout(bookingId: string) {
  const userId = await getUserId();
  if (!userId) redirect("/connexion");
  if (!isStripeConfigured) redirect(`/reservations/${bookingId}?paiement=indisponible`);

  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select("id, status, sender_id, total_cents, weight_kg, trip:trips(from_city, to_city, departure_at)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!b || b.sender_id !== userId || b.status !== "accepted") redirect(`/reservations/${bookingId}`);
  const trip = Array.isArray(b.trip) ? b.trip[0] : b.trip;

  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: b.total_cents,
            product_data: {
              name: `Envoi de colis ${codeFor(trip?.from_city ?? "")} → ${codeFor(trip?.to_city ?? "")}`,
              description: `${b.weight_kg} kg, frais de service inclus.`,
            },
          },
        },
      ],
      client_reference_id: b.id,
      metadata: { booking_id: b.id },
      payment_intent_data: { metadata: { booking_id: b.id } },
      success_url: `${SITE_URL}/reservations/${b.id}?paiement=ok`,
      cancel_url: `${SITE_URL}/reservations/${b.id}?paiement=annule`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      locale: "fr",
      integration_identifier: INTEGRATION_ID,
    },
    { idempotencyKey: `checkout-${b.id}-${Math.floor(Date.now() / 600_000)}` },
  );

  await admin.from("bookings").update({ stripe_checkout_session_id: session.id }).eq("id", b.id);
  if (!session.url) redirect(`/reservations/${b.id}?paiement=erreur`);
  redirect(session.url);
}
