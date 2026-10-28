// « Prochaine étape » d'une réservation : une seule chose à faire, dite clairement, pour chaque rôle et chaque statut.
import { missingPhotos, REQUIRED_BEFORE_DELIVERY } from "@/lib/parcel-photos";
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

export function nextStep(i: Input): NextStep | null {
  const has = (k: string) => i.events.some((e) => e.kind === k);
  const senderPhotos = missingPhotos(i.photos, ["contents", "packed"]);
  const done = 2 - senderPhotos.length;

  if (i.role === "sender") {
    switch (i.status) {
      case "pending":
        return { tone: "wait", title: `En attente de la réponse de ${i.travelerName}`, text: "Vous serez prévenu dès qu'il accepte. Vous pouvez lui écrire en attendant.", cta: { label: "Écrire au voyageur", href: "#discussion" } };
      case "accepted":
        return {
          tone: "action",
          title: `Payez ${i.total} pour confirmer votre envoi`,
          text: "Ensuite : 2 photos du colis (contenu, puis colis emballé avec l'étiquette) avant de le remettre.",
          cta: { label: "Payer", href: "#actions" },
        };
      case "paid":
        return senderPhotos.length
          ? { tone: "action", title: `Ajoutez les photos du colis (${done} sur 2)`, text: `${i.travelerName} ne peut pas prendre le colis sans elles.`, cta: { label: "Ajouter les photos", href: "#photos" } }
          : { tone: "action", title: `Remettez le colis à ${i.travelerName}`, text: `Transmettez le code de réception à ${i.recipientName} : il le donnera au voyageur à l'arrivée.`, cta: { label: "Voir le code", href: "#actions" } };
      case "picked_up":
        return { tone: "wait", title: has("arrived") ? "Votre colis est arrivé à destination" : "Votre colis voyage", text: `Rien à faire : ${i.recipientName} donnera son code au voyageur à la remise.`, cta: { label: "Voir le suivi", href: "#suivi" } };
      case "delivered":
        return i.reviewed
          ? { tone: "done", title: "Colis réceptionné", text: "Merci d'avoir choisi Send By Me." }
          : { tone: "action", title: `Colis réceptionné : notez ${i.travelerName}`, text: "Votre avis aide les autres expéditeurs.", cta: { label: "Laisser un avis", href: "#actions" } };
      default:
        return null;
    }
  }

  switch (i.status) {
    case "pending":
      return { tone: "action", title: `Répondez à la demande de ${i.senderName}`, text: "Après le paiement, vous photographierez le colis à la remise et à l'arrivée.", cta: { label: "Accepter ou refuser", href: "#actions" } };
    case "accepted":
      return { tone: "wait", title: `En attente du paiement de ${i.senderName}`, text: "Ne prenez pas le colis avant le paiement." };
    case "paid":
      if (senderPhotos.length) return { tone: "wait", title: `En attente des photos de ${i.senderName} (${done} sur 2)`, text: "Vous pourrez ensuite confirmer la prise en charge." };
      if (missingPhotos(i.photos, ["pickup"]).length)
        return { tone: "action", title: "À la remise, photographiez le colis emballé", text: "Comparez le contenu avec les photos de l'expéditeur avant qu'il soit fermé.", cta: { label: "Ajouter la photo", href: "#photos" } };
      return { tone: "action", title: "Confirmez que vous avez reçu le colis", cta: { label: "J'ai reçu le colis", href: "#actions" } };
    case "picked_up":
      if (!has("departed")) return { tone: "action", title: "Bon voyage !", text: "Le suivi passe « en transit » au départ du vol, ou signalez-le vous-même.", cta: { label: "Je suis parti", href: "#actions" } };
      if (i.homeDelivery) return { tone: "action", title: "Remettez le colis au livreur partenaire", cta: { label: "Voir les consignes", href: "#actions" } };
      if (missingPhotos(i.photos, REQUIRED_BEFORE_DELIVERY).length)
        return { tone: "action", title: "À l'arrivée, photographiez le colis toujours fermé", cta: { label: "Ajouter la photo", href: "#photos" } };
      return { tone: "action", title: `Saisissez le code de ${i.recipientName}`, text: "Il vous le donne en recevant le colis.", cta: { label: "Saisir le code", href: "#actions" } };
    case "delivered":
      return i.reviewed
        ? { tone: "done", title: "Transaction terminée", text: "Vos gains vous seront versés dans les prochains jours." }
        : { tone: "action", title: `Transaction terminée : notez ${i.senderName}`, cta: { label: "Laisser un avis", href: "#actions" } };
    default:
      return null;
  }
}
