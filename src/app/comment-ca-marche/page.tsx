import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description: "Envoyer un colis avec un voyageur, étape par étape : recherche, demande, paiement bloqué, remise avec code.",
  alternates: { canonical: "/comment-ca-marche" },
};

export default function HowItWorks() {
  return (
    <ProsePage
      title="Comment ça marche"
      intro="Send By Me met en relation des personnes qui envoient un colis et des voyageurs qui ont de la place dans leurs bagages. Voici le parcours complet, côté expéditeur et côté voyageur."
    >
      <section>
        <h2>Vous envoyez un colis</h2>
        <ul>
          <li><strong>Cherchez un trajet</strong> entre votre ville et celle de votre destinataire. Comparez la date, le prix au kilo, les avis et le badge d&apos;identité vérifiée.</li>
          <li><strong>Envoyez une demande</strong> en indiquant le poids, le type et le contenu du colis. Le prix total s&apos;affiche avant l&apos;envoi.</li>
          <li><strong>Payez quand le voyageur accepte.</strong> L&apos;argent est bloqué par Send By Me : le voyageur ne le touche pas encore.</li>
          <li><strong>Remettez le colis ouvert</strong> au voyageur, au lieu convenu par messagerie. Il vérifie le contenu, puis vous le fermez ensemble.</li>
          <li><strong>Transmettez le code de remise</strong> à votre destinataire. Il le donne au voyageur en recevant le colis. Le paiement est alors libéré.</li>
        </ul>
      </section>
      <section>
        <h2>Vous avez des kilos libres</h2>
        <ul>
          <li><strong>Publiez votre trajet</strong> : villes, date, kilos disponibles, prix au kilo et types de colis acceptés.</li>
          <li><strong>Acceptez ou refusez</strong> chaque demande. Posez toutes vos questions avant d&apos;accepter.</li>
          <li><strong>Attendez le paiement</strong> avant de prendre un colis. Vous êtes prévenu dès qu&apos;il est bloqué.</li>
          <li><strong>Contrôlez le contenu</strong> au moment de la remise. Refusez tout ce qui vous semble douteux.</li>
          <li><strong>Saisissez le code</strong> que vous donne le destinataire. Vous êtes payé du montant que vous avez fixé.</li>
        </ul>
      </section>
      <section>
        <h2>Les frais</h2>
        <p>
          La publication de trajets est gratuite. L&apos;expéditeur paie le prix fixé par le voyageur, plus 12 % de frais de service
          (2 € minimum). Ces frais financent la vérification des membres, le paiement sécurisé et le support.
        </p>
      </section>
      <div className="flex flex-wrap gap-3 pt-2">
        <ButtonLink href="/recherche">Trouver un voyageur</ButtonLink>
        <ButtonLink href="/publier" variant="signal">Proposer mes kilos</ButtonLink>
      </div>
    </ProsePage>
  );
}
