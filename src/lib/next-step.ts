// « Prochaine étape » d'une réservation : une seule chose à faire, dite clairement, pour chaque rôle et chaque statut.
import { missingPhotos, REQUIRED_BEFORE_DELIVERY } from "@/lib/parcel-photos";
import type { T } from "@/i18n/config";
import type { BookingStatus } from "@/lib/types";

export type NextStep = {
  tone: "action" | "wait" | "done";
  title: string;
  text?: string;
  cta?: { label: string; href: string };
};

type Input = {
  role: "sender" | "traveler";
  status: BookingStatus;
  photos: { kind: string }[];
  events: { kind: string }[];
  homeDelivery: boolean;
  reviewed: boolean;
  senderName: string;
  travelerName: string;
  recipientName: string;
  total: string;
};

export function nextStep(i: Input, t: T): NextStep | null {
  const has = (k: string) => i.events.some((e) => e.kind === k);
  const senderPhotos = missingPhotos(i.photos, ["contents", "packed"]);
  const done = 2 - senderPhotos.length;

  if (i.role === "sender") {
    switch (i.status) {
      case "pending":
        return { tone: "wait", title: t("En attente de la réponse de {traveler}", { traveler: i.travelerName }), text: t("Vous serez prévenu dès qu'il accepte. Vous pouvez lui écrire en attendant."), cta: { label: t("Écrire au voyageur"), href: "#discussion" } };
      case "accepted":
        return {
          tone: "action",
          title: t("Payez {total} pour confirmer votre envoi", { total: i.total }),
          text: t("Ensuite : 2 photos du colis (contenu, puis colis emballé avec l'étiquette) avant de le remettre."),
          cta: { label: t("Payer"), href: "#actions" },
        };
      case "paid":
        return senderPhotos.length
          ? { tone: "action", title: t("Ajoutez les photos du colis ({done} sur 2)", { done: done }), text: t("{traveler} ne peut pas prendre le colis sans elles.", { traveler: i.travelerName }), cta: { label: t("Ajouter les photos"), href: "#photos" } }
          : { tone: "action", title: t("Remettez le colis à {traveler}", { traveler: i.travelerName }), text: t("Transmettez le code de réception à {recipient} : il le donnera au voyageur à l'arrivée.", { recipient: i.recipientName }), cta: { label: t("Voir le code"), href: "#actions" } };
      case "picked_up":
        return { tone: "wait", title: t(has("arrived") ? "Votre colis est arrivé à destination" : "Votre colis voyage"), text: t("Rien à faire : {recipient} donnera son code au voyageur à la remise.", { recipient: i.recipientName }), cta: { label: t("Voir le suivi"), href: "#suivi" } };
      case "delivered":
        return i.reviewed
          ? { tone: "done", title: t("Colis réceptionné"), text: t("Merci d'avoir choisi Send By Me.") }
          : { tone: "action", title: t("Colis réceptionné : notez {traveler}", { traveler: i.travelerName }), text: t("Votre avis aide les autres expéditeurs."), cta: { label: t("Laisser un avis"), href: "#actions" } };
      default:
        return null;
    }
  }

  switch (i.status) {
    case "pending":
      return { tone: "action", title: t("Répondez à la demande de {sender}", { sender: i.senderName }), text: t("Après le paiement, vous photographierez le colis à la remise et à l'arrivée."), cta: { label: t("Accepter ou refuser"), href: "#actions" } };
    case "accepted":
      return { tone: "wait", title: t("En attente du paiement de {sender}", { sender: i.senderName }), text: t("Ne prenez pas le colis avant le paiement.") };
    case "paid":
      if (senderPhotos.length) return { tone: "wait", title: t("En attente des photos de {sender} ({done} sur 2)", { sender: i.senderName, done: done }), text: t("Vous pourrez ensuite confirmer la prise en charge.") };
      if (missingPhotos(i.photos, ["pickup"]).length)
        return { tone: "action", title: t("À la remise, photographiez le colis emballé"), text: t("Comparez le contenu avec les photos de l'expéditeur avant qu'il soit fermé."), cta: { label: t("Ajouter la photo"), href: "#photos" } };
      return { tone: "action", title: t("Confirmez que vous avez reçu le colis"), cta: { label: t("J'ai reçu le colis"), href: "#actions" } };
    case "picked_up":
      if (!has("departed")) return { tone: "action", title: t("Bon voyage !"), text: t("Le suivi passe « en transit » au départ du vol, ou signalez-le vous-même."), cta: { label: t("Je suis parti"), href: "#actions" } };
      if (i.homeDelivery) return { tone: "action", title: t("Remettez le colis au livreur partenaire"), cta: { label: t("Voir les consignes"), href: "#actions" } };
      if (missingPhotos(i.photos, REQUIRED_BEFORE_DELIVERY).length)
        return { tone: "action", title: t("À l'arrivée, photographiez le colis toujours fermé"), cta: { label: t("Ajouter la photo"), href: "#photos" } };
      return { tone: "action", title: t("Saisissez le code de {recipient}", { recipient: i.recipientName }), text: t("Il vous le donne en recevant le colis."), cta: { label: t("Saisir le code"), href: "#actions" } };
    case "delivered":
      return i.reviewed
        ? { tone: "done", title: t("Transaction terminée"), text: t("Vos gains vous seront versés dans les prochains jours.") }
        : { tone: "action", title: t("Transaction terminée : notez {sender}", { sender: i.senderName }), cta: { label: t("Laisser un avis"), href: "#actions" } };
    default:
      return null;
  }
}
