import type Stripe from "stripe";
import { markPaid } from "@/lib/booking-payment";
import { notifySafe } from "@/lib/notify";
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
        await notifySafe(userId, { kind: "verification_approved", title: "Identité vérifiée !", body: "Votre badge bleu est maintenant visible.", href: "/espace/profil", email: true });
      }
      break;
    }
    case "checkout.session.async_payment_failed":
      // La réservation reste « acceptée » : l'expéditeur peut relancer le paiement.
      break;
  }

  return Response.json({ received: true });
}
