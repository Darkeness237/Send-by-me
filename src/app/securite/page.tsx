import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = {
  title: "Sécurité et confiance",
  description: "Paiement bloqué, code de remise, identités vérifiées, avis : comment Send By Me protège expéditeurs et voyageurs.",
  alternates: { canonical: "/securite" },
};

export default function Security() {
  return (
    <ProsePage
      title="Sécurité et confiance"
      intro="Confier un colis ou en transporter un demande de la confiance. Voici ce que nous faisons pour la mériter, et les règles que nous demandons à chacun de suivre."
    >
      <section>
        <h2>Le paiement reste bloqué jusqu&apos;à la remise</h2>
        <p>
          L&apos;expéditeur paie en ligne par carte. Le montant est conservé par Send By Me et n&apos;est versé au voyageur qu&apos;après
          la saisie du code de remise. Si le colis n&apos;est pas livré, l&apos;expéditeur est remboursé après examen du dossier.
        </p>
      </section>
      <section>
        <h2>Le code de remise</h2>
        <p>
          Un code à 6 chiffres est créé après le paiement. Seul l&apos;expéditeur le voit, et le transmet à son destinataire. Le
          voyageur ne peut valider la livraison qu&apos;avec ce code. Après 5 essais incorrects, la validation est bloquée et notre
          équipe intervient.
        </p>
      </section>
      <section>
        <h2>Identité vérifiée</h2>
        <p>
          Le badge bleu signifie que notre équipe a contrôlé une pièce d&apos;identité du membre. Nous vous conseillons de privilégier
          les voyageurs vérifiés et ayant déjà des avis.
        </p>
      </section>
      <section>
        <h2>Les règles à suivre</h2>
        <ul>
          <li>Payez toujours sur Send By Me. Un paiement en espèces ou par transfert direct n&apos;est pas protégé.</li>
          <li>Le voyageur contrôle le contenu du colis devant l&apos;expéditeur, avant de le fermer.</li>
          <li>Le voyageur peut refuser un colis à tout moment s&apos;il a un doute.</li>
          <li>
            Aucun <Link href="/objets-interdits" className="font-semibold text-brand">objet interdit</Link>, même en petite quantité.
          </li>
          <li>Ne partagez pas le code de remise avec le voyageur : c&apos;est le destinataire qui le lui donne.</li>
        </ul>
      </section>
      <section>
        <h2>Signaler un problème</h2>
        <p>
          Écrivez-nous à <a href="mailto:support@sendbyme.app" className="font-semibold text-brand">support@sendbyme.app</a> en
          indiquant le lien de la réservation. Le paiement reste bloqué le temps de l&apos;examen.
        </p>
      </section>
    </ProsePage>
  );
}
