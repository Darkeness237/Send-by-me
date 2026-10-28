import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { ButtonLink } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Comment ça marche"),
    description: t("Envoyer un colis avec un voyageur, étape par étape : recherche, demande, paiement, remise avec code."),
    alternates: { canonical: "/comment-ca-marche" },
  };
}

export default async function HowItWorks() {
  const t = await getT();
  return (
    <ProsePage
      title={t("Comment ça marche")}
      intro={t("Send By Me met en relation des personnes qui envoient un colis et des voyageurs qui ont de la place dans leurs bagages. Voici le parcours complet, côté expéditeur et côté voyageur.")}
    >
      <section>
        <h2>{t("Vous envoyez un colis")}</h2>
        <ul>
          <li><strong>{t("Cherchez un trajet")}</strong>{" "}{t("entre votre ville et celle de votre destinataire. Comparez la date, le prix au kilo, les avis et le badge d'identité vérifiée.")}</li>
          <li><strong>{t("Envoyez une demande")}</strong>{" "}{t("en indiquant le poids, le type et le contenu du colis. Le prix total s'affiche avant l'envoi.")}</li>
          <li><strong>{t("Payez quand le voyageur accepte.")}</strong>{" "}{t("L'argent est bloqué par Send By Me : le voyageur ne le touche pas encore.")}</li>
          <li><strong>{t("Remettez le colis ouvert")}</strong>{" "}{t("au voyageur, au lieu convenu par messagerie. Il vérifie le contenu, puis vous le fermez ensemble.")}</li>
          <li><strong>{t("Transmettez le code de remise")}</strong>{" "}{t("à votre destinataire. Il le donne au voyageur en recevant le colis.")}</li>
        </ul>
      </section>
      <section>
        <h2>{t("Vous avez des kilos libres")}</h2>
        <ul>
          <li><strong>{t("Publiez votre trajet")}</strong>{" "}{t(": villes, date, kilos disponibles, prix au kilo et types de colis acceptés.")}</li>
          <li><strong>{t("Acceptez ou refusez")}</strong>{" "}{t("chaque demande. Posez toutes vos questions avant d'accepter.")}</li>
          <li><strong>{t("Attendez le paiement")}</strong>{" "}{t("avant de prendre un colis. Vous êtes prévenu dès qu'il est fait.")}</li>
          <li><strong>{t("Contrôlez le contenu")}</strong>{" "}{t("au moment de la remise. Refusez tout ce qui vous semble douteux.")}</li>
          <li><strong>{t("Saisissez le code")}</strong>{" "}{t("que vous donne le destinataire. Vous êtes payé du montant que vous avez fixé.")}</li>
        </ul>
      </section>
      <section>
        <h2>{t("Les frais")}</h2>
        <p>
          {t("La publication de trajets est gratuite. L'expéditeur paie le prix fixé par le voyageur, la livraison à domicile s'il l'a choisie, et des frais de service dégressifs selon le poids : 15 % jusqu'à 5 kg, 12 % jusqu'à 10 kg, 10 % jusqu'à 20 kg et 8 % au-delà (1,50 € net minimum), plus un forfait de 2 € par envoi pour la sécurité et le suivi, frais bancaires du paiement inclus. Ces frais financent la vérification des membres, le code de réception envoyé au destinataire, le suivi en temps réel, les photos de traçabilité, le paiement sécurisé et l'assistance en cas de litige.")}
        </p>
      </section>
      <div className="flex flex-wrap gap-3 pt-2">
        <ButtonLink href="/recherche">{t("Trouver un voyageur")}</ButtonLink>
        <ButtonLink href="/publier" variant="signal">{t("Proposer mes kilos")}</ButtonLink>
      </div>
    </ProsePage>
  );
}
