import { randomInt } from "node:crypto";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook Stripe : seule source de vérité pour marquer une réservation comme payée.
 * Événements à activer : checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, identity.verification_session.verified.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Configuration manquante", { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
        await markPaid(session);
      }
      break;
    }
    case "identity.verification_session.verified": {
      // KYC Stripe Identity réussi : pièce authentique et selfie correspondant.
      const vs = event.data.object as Stripe.Identity.VerificationSession;
      const userId = vs.metadata?.user_id ?? vs.client_reference_id;
      if (userId && /^[0-9a-f-]{36}$/.test(userId)) {
        await createAdminClient().from("profiles").update({ id_verified: true }).eq("id", userId);
      }
      break;
    }
    case "checkout.session.async_payment_failed":
      // La réservation reste « acceptée » : l'expéditeur peut relancer le paiement.
      break;
  }

  return Response.json({ received: true });
}

async function markPaid(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id ?? session.client_reference_id;
  if (!bookingId) return;

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, sender_id, total_cents, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return;

  // Contrôle du montant encaissé.
  if (session.amount_total !== booking.total_cents || session.currency !== "eur") {
    console.error("Montant Stripe inattendu pour la réservation", bookingId);
    return;
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
  }
}
