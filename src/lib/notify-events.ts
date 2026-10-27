import "server-only";

import { notifySafe } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

/** Expéditeur, voyageur et ligne d'une réservation (pour rédiger les notifications). */
async function parties(bookingId: string) {
  const { data } = await createAdminClient()
    .from("bookings")
    .select("id, sender_id, tracking_code, base_cents, trip:trips(traveler_id, from_city, to_city)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!data) return null;
  const trip = Array.isArray(data.trip) ? data.trip[0] : data.trip;
  return {
    senderId: data.sender_id as string,
    travelerId: trip?.traveler_id as string,
    route: trip ? `${trip.from_city} → ${trip.to_city}` : "votre envoi",
    href: `/reservations/${data.id}`,
  };
}

type Event =
  | "requested"
  | "accepted"
  | "declined"
  | "paid"
  | "picked_up"
  | "departed"
  | "arrived"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "refunded";

/** Notifie la bonne personne pour chaque étape d'une réservation. */
export async function notifyBooking(bookingId: string, event: Event) {
  const p = await parties(bookingId);
  if (!p) return;
  const { senderId, travelerId, route, href } = p;
  const toSender = (title: string, body: string, email = true) => notifySafe(senderId, { kind: `booking_${event}`, title, body, href, email });
  const toTraveler = (title: string, body: string, email = true) => notifySafe(travelerId, { kind: `booking_${event}`, title, body, href, email });
  switch (event) {
    case "requested":
      return toTraveler("Nouvelle demande de réservation", `Un expéditeur souhaite envoyer un colis sur votre trajet ${route}. Répondez-lui vite.`);
    case "accepted":
      return toSender("Le voyageur a accepté votre demande", `Payez pour confirmer votre envoi ${route}. L'argent reste bloqué jusqu'à la livraison.`);
    case "declined":
      return toSender("Demande refusée", `Le voyageur ne peut pas prendre votre colis ${route}. D'autres trajets vous attendent.`);
    case "paid":
      return toTraveler("Paiement reçu et bloqué", `L'expéditeur a payé pour ${route}. Convenez de la remise du colis dans la conversation.`);
    case "picked_up":
      return toSender("Colis remis au voyageur", `Votre colis ${route} est entre les mains du voyageur.`, false);
    case "departed":
      return toSender("Votre colis est en route", `Le voyageur est parti : ${route}.`, false);
    case "arrived":
      return toSender("Votre colis est arrivé", `Le voyageur est arrivé à destination (${route}).`);
    case "out_for_delivery":
      return toSender("Colis remis au livreur", `Notre partenaire apporte votre colis au domicile du destinataire (${route}).`, false);
    case "delivered":
      await toSender("Colis livré", `Votre destinataire a reçu le colis ${route}. Laissez un avis au voyageur.`);
      return toTraveler("Livraison confirmée", `Bravo ! Le paiement pour ${route} va vous être versé.`);
    case "delivery_failed":
      return toSender("Livraison à domicile non aboutie", `Notre équipe vous contacte pour organiser une nouvelle livraison (${route}).`);
    case "refunded":
      return toSender("Vous avez été remboursé", `Le remboursement de votre envoi ${route} est en cours.`);
  }
}

/** Nouveau message : notification dans l'application et sur le téléphone (pas d'e-mail à chaque message). */
export async function notifyMessage(thread: { bookingId?: string; inquiryId?: string }, authorId: string, body: string) {
  const db = createAdminClient();
  let recipient: string | null = null;
  let href = "/messages";
  if (thread.bookingId) {
    const p = await parties(thread.bookingId);
    if (!p) return;
    recipient = authorId === p.senderId ? p.travelerId : p.senderId;
    href = p.href;
  } else if (thread.inquiryId) {
    const { data } = await db.from("inquiries").select("sender_id, traveler_id").eq("id", thread.inquiryId).maybeSingle();
    if (!data) return;
    recipient = authorId === data.sender_id ? data.traveler_id : data.sender_id;
    href = `/messages/${thread.inquiryId}`;
  }
  const { data: author } = await db.from("profiles").select("full_name").eq("id", authorId).maybeSingle();
  await notifySafe(recipient, { kind: "message", title: `Message de ${author?.full_name || "un membre"}`, body: body.slice(0, 140), href });
}
