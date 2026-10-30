// Textes enregistrés en base avec des valeurs (notes de contrôle de vol) : traduits par motif.
import type { Locale } from "./config";
import { en } from "./en";

const NOTE_PATTERNS: [RegExp, string][] = [
  [/^Compagnie reconnue : (.+)$/, "Airline recognised: $1"],
  [/^Compagnie inconnue$/, "Unknown airline"],
  [/^Numéro de vol au bon format \((.+)\)$/, "Flight number in the right format ($1)"],
  [/^Numéro de vol mal formé$/, "Malformed flight number"],
  [/^Le numéro de vol correspond à la compagnie$/, "The flight number matches the airline"],
  [/^Le numéro de vol ne correspond pas à la compagnie$/, "The flight number doesn't match the airline"],
  [/^Départ de (.+), cohérent avec (.+)$/, "Departs from $1, consistent with $2"],
  [/^L'aéroport (.+) ne dessert pas (.+)$/, "Airport $1 doesn't serve $2"],
  [/^Arrivée à (.+), cohérente avec (.+)$/, "Arrives at $1, consistent with $2"],
  [/^Vol (.+) introuvable dans les horaires du (.+)$/, "Flight $1 not found in the schedule for $2"],
  [/^Le vol (.+) ne part pas de (.+) ce jour-là$/, "Flight $1 doesn't depart from $2 that day"],
  [/^L'heure annoncée diffère de l'horaire du vol \((\d+) h d'écart\)$/, "The stated time differs from the flight schedule ($1 h apart)"],
  [/^Vol (.+) trouvé dans les horaires réels$/, "Flight $1 found in the real schedule"],
];

export function translateNote(label: string, locale: Locale) {
  if (locale === "fr") return label;
  for (const [re, en] of NOTE_PATTERNS) if (re.test(label)) return label.replace(re, en);
  return label;
}

// Notifications enregistrées en français (déclencheurs SQL et serveur) : traduites à l'affichage.
const DB_PATTERNS: [RegExp, string][] = [
  [/^Un expéditeur souhaite envoyer un colis sur votre trajet (.+)\. Répondez-lui vite\.$/, "A sender wants to send a parcel on your trip $1. Reply quickly."],
  [/^Payez pour confirmer votre envoi (.+)\.$/, "Pay to confirm your shipment $1."],
  [/^Le voyageur ne peut pas prendre votre colis (.+)\. D'autres trajets vous attendent\.$/, "The traveller can't take your parcel $1. Other trips are waiting for you."],
  [/^Votre paiement pour (.+) est confirmé\. (.+) a reçu son code de réception par e-mail\.$/, "Your payment for $1 is confirmed. $2 has received their delivery code by e-mail."],
  [/^L'expéditeur a payé pour (.+)\. Convenez de la remise du colis dans la conversation\.$/, "The sender has paid for $1. Arrange the parcel handover in the conversation."],
  [/^Le voyageur a pris en charge votre colis (.+)\. Le suivi passera en transit au décollage\.$/, "The traveller has picked up your parcel $1. Tracking will switch to in transit at take-off."],
  [/^Le voyage a commencé : (.+), vol (.+)\.$/, "The journey has started: $1, flight $2."],
  [/^Le voyage a commencé : (.+)\.$/, "The journey has started: $1."],
  [/^Le voyageur est arrivé à destination \((.+)\)\.$/, "The traveller has arrived at the destination ($1)."],
  [/^Notre partenaire apporte votre colis au domicile du destinataire \((.+)\)\.$/, "Our partner is bringing your parcel to the recipient's home ($1)."],
  [/^(.+) a bien reçu votre colis (.+) et a validé la réception avec son code\. Merci d'avoir choisi Send By Me ! Laissez un avis au voyageur\.$/, "$1 has received your parcel $2 and confirmed delivery with their code. Thank you for choosing Send By Me! Leave the traveller a review."],
  [/^La réception du colis (.+) est validée\. La transaction est terminée : (.+) vous seront versés dans les prochains jours\.$/, "Delivery of parcel $1 is confirmed. The transaction is complete: $2 will be paid to you in the next few days."],
  [/^Notre équipe vous contacte pour organiser une nouvelle livraison \((.+)\)\.$/, "Our team will contact you to arrange a new delivery ($1)."],
  [/^Le remboursement de votre envoi (.+) est en cours\.$/, "The refund for your shipment $1 is in progress."],
  [/^Message de un membre$/, "Message from a member"],
  [/^Message de (.+)$/, "Message from $1"],
  [/^Proposition à (.+) pour (.+)\. Acceptez, refusez ou faites une contre-proposition\.$/, "Offer of $1 for $2. Accept, decline or make a counter-offer."],
  [/^Le prix de (.+) est accepté pour (.+)\.$/, "The price of $1 has been accepted for $2."],
  [/^La proposition à (.+) pour (.+) n'a pas été retenue\.$/, "The offer of $1 for $2 was not accepted."],
  [/^Motif : (.+)\. Vous pouvez envoyer de nouveaux documents\.$/, "Reason: $1. You can send new documents."],
  [/^(.+) kg à envoyer de (.+) à (.+)\. Proposez votre trajet à l'expéditeur\.$/, "$1 kg to send from $2 to $3. Offer your trip to the sender."],
  [/^Pour votre colis (.+)\. Répondez-lui dans la messagerie\.$/, "About your parcel $1. Reply in your messages."],
  [/^Nouveau trajet (.+)$/, "New trip $1"],
  [/^Trajet publié : (.+)$/, "Trip published: $1"],
  [/^Demande publiée : (.+)$/, "Request published: $1"],
  [/^Prime de 5 € : (\d+) livraisons réussies$/, "€5 bonus: $1 successful deliveries"],
  [/^Virement de (.+) envoyé$/, "Transfer of $1 sent"],
  [/^Votre part pour (.+) est en route vers votre compte bancaire\.$/, "Your share for $1 is on its way to your bank account."],
];

/** Texte stocké en base : traduction exacte, sinon par motif. */
export function translateDb(text: string, locale: Locale) {
  if (locale === "fr" || !text) return text;
  if (en[text]) return en[text];
  for (const [re, out] of DB_PATTERNS) if (re.test(text)) return text.replace(re, out);
  return text;
}
