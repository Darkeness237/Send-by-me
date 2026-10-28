import "server-only";

import { notifySafe } from "@/lib/notify";
import { euros } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

/** Expéditeur, voyageur et ligne d'une réservation (pour rédiger les notifications). */
async function parties(bookingId: string) {
  const { data } = await createAdminClient()
    .from("bookings")
    .select("id, sender_id, tracking_code, base_cents, recipient_name, trip:trips(traveler_id, from_city, to_city, transport_ref)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!data) return null;
  const trip = Array.isArray(data.trip) ? data.trip[0] : data.trip;
  return {
    senderId: data.sender_id as string,
    travelerId: trip?.traveler_id as string,
    route: trip ? `${trip.from_city} → ${trip.to_city}` : "votre envoi",
    href: `/reservations/${data.id}`,
    recipient: (data.recipient_name as string) || "Votre destinataire",
    payout: euros(data.base_cents as number),
    flight: (trip?.transport_ref as string | null) ?? null,
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
  const { senderId, travelerId, route, href, recipient, payout, flight } = p;
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
      await toSender("Paiement confirmé", `Votre paiement pour ${route} est bloqué jusqu'à la livraison. ${recipient} a reçu son code de réception par e-mail.`);
      return toTraveler("Paiement reçu : en attente du colis", `L'expéditeur a payé pour ${route}. Convenez de la remise du colis dans la conversation.`);
    case "picked_up":
      return toSender("Colis reçu par le voyageur", `Le voyageur a pris en charge votre colis ${route}. Le suivi passera en transit au décollage.`);
    case "departed":
      return toSender("Votre colis est en transit", `Le voyage a commencé : ${route}${flight ? `, vol ${flight}` : ""}.`);
    case "arrived":
      return toSender("Votre colis est arrivé", `Le voyageur est arrivé à destination (${route}).`);
    case "out_for_delivery":
      return toSender("Colis remis au livreur", `Notre partenaire apporte votre colis au domicile du destinataire (${route}).`, false);
    case "delivered":
      await toSender("Colis réceptionné", `${recipient} a bien reçu votre colis ${route} et a validé la réception avec son code. Merci d'avoir choisi Send By Me ! Laissez un avis au voyageur.`);
      return toTraveler("Transaction terminée", `La réception du colis ${route} est validée. La transaction est terminée : ${payout} vous seront versés dans les prochains jours.`);
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

/** Négociation du prix : nouvelle offre, offre acceptée ou refusée. */
export async function notifyOffer(bookingId: string, toUserId: string, event: "offer" | "offer_accepted" | "offer_declined", priceCents: number) {
  const p = await parties(bookingId);
  if (!p) return;
  const price = `${euros(priceCents)} le kilo`;
  const notice = {
    offer: { title: "Nouvelle proposition de prix", body: `Proposition à ${price} pour ${p.route}. Acceptez, refusez ou faites une contre-proposition.` },
    offer_accepted: { title: "Proposition acceptée", body: `Le prix de ${price} est accepté pour ${p.route}.` },
    offer_declined: { title: "Proposition refusée", body: `La proposition à ${price} pour ${p.route} n'a pas été retenue.` },
  }[event];
  await notifySafe(toUserId, { kind: `booking_${event}`, ...notice, href: p.href, email: event === "offer" });
}
