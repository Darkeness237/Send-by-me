import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/prose-page";
import { getT } from "@/i18n/server";
import { BOOST_FEE_CENTS } from "@/lib/ambassador";
import { LEGAL_UPDATED, MEDIATOR, PUBLISHER } from "@/lib/legal";
import { COMMISSION_TIERS, MIN_COMMISSION_CENTS, SECURITY_FEE_CENTS, euros, percent } from "@/lib/pricing";
import { REFERRAL_REWARD_CENTS } from "@/lib/referral";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Conditions d'utilisation"), alternates: { canonical: "/cgu" } };
}

const tierLabel = (i: number) => {
  const tier = COMMISSION_TIERS[i];
  const from = i === 0 ? 0 : COMMISSION_TIERS[i - 1].upToKg;
  return tier.upToKg === Infinity ? `plus de ${from} kg` : i === 0 ? `jusqu'à ${tier.upToKg} kg` : `de ${from} à ${tier.upToKg} kg`;
};

// Les montants et taux viennent du code (pricing, ambassador, referral) : les CGU restent alignées sur ce qui est facturé.
export default function Terms() {
  return (
    <ProsePage frenchOnly title="Conditions générales d'utilisation" intro={`En vigueur au ${LEGAL_UPDATED}.`}>
      <section>
        <h2>1. Objet</h2>
        <p>
          Ces conditions régissent l&apos;utilisation du site send-by-me.com et de l&apos;application Send By Me (le « service »), édités
          par {PUBLISHER.name} (voir les <Link href="/mentions-legales">mentions légales</Link>). Créer un compte, publier une annonce
          ou réserver vaut acceptation de ces conditions.
        </p>
      </section>

      <section>
        <h2>2. Définitions</h2>
        <ul>
          <li>Membre : toute personne inscrite sur le service.</li>
          <li>Voyageur : membre qui propose des kilos libres dans ses bagages pour un trajet donné.</li>
          <li>Expéditeur : membre qui confie un colis à un voyageur.</li>
          <li>Destinataire : personne désignée par l&apos;expéditeur pour recevoir le colis.</li>
          <li>Code de remise : code à 6 chiffres transmis au seul expéditeur et à son destinataire, qui valide la livraison.</li>
        </ul>
      </section>

      <section>
        <h2>3. Rôle de Send By Me</h2>
        <p>
          Send By Me met en relation des expéditeurs et des voyageurs particuliers. Send By Me n&apos;est ni transporteur, ni
          commissionnaire de transport, ni partie au contrat de transport conclu entre l&apos;expéditeur et le voyageur. Le voyageur
          transporte le colis sous sa propre responsabilité. Send By Me fournit les outils de mise en relation, de paiement, de suivi et
          d&apos;assistance décrits ci-dessous.
        </p>
      </section>

      <section>
        <h2>4. Compte</h2>
        <ul>
          <li>Il faut avoir 18 ans, agir à titre personnel et non professionnel, et fournir des informations exactes.</li>
          <li>Chaque membre ne détient qu&apos;un compte et garde son mot de passe confidentiel.</li>
          <li>
            Le badge « identité vérifiée » est attribué après contrôle d&apos;une pièce d&apos;identité et d&apos;un selfie. Il confirme
            l&apos;identité du membre à la date du contrôle, pas son comportement.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Annonces et réservations</h2>
        <ul>
          <li>Le voyageur publie un trajet réel : villes, date, kilos disponibles, prix au kilo et types d&apos;objets acceptés.</li>
          <li>L&apos;expéditeur envoie une demande décrivant honnêtement son colis (poids, contenu, valeur approximative).</li>
          <li>Le voyageur accepte ou refuse librement. S&apos;il accepte, les kilos sont réservés.</li>
          <li>L&apos;expéditeur paie en ligne. La réservation n&apos;est confirmée qu&apos;après paiement.</li>
        </ul>
        <p>Un expéditeur peut aussi publier une demande d&apos;envoi, à laquelle les voyageurs répondent par une proposition.</p>
      </section>

      <section>
        <h2>6. Prix et frais</h2>
        <p>
          Le voyageur fixe librement son prix au kilo, qui lui revient intégralement. L&apos;expéditeur paie en plus des frais de
          service, qui comprennent :
        </p>
        <ul>
          <li>
            une commission selon le poids du colis :{" "}
            {COMMISSION_TIERS.map((t, i) => `${percent(t.rate)} ${tierLabel(i)}`).join(", ")} du prix du transport, avec un minimum de{" "}
            {euros(MIN_COMMISSION_CENTS)} ;
          </li>
          <li>un forfait de {euros(SECURITY_FEE_CENTS)} par envoi pour la sécurité, le code de remise et le suivi ;</li>
          <li>les frais bancaires de paiement.</li>
        </ul>
        <p>
          La livraison à domicile, lorsqu&apos;elle est proposée, est un service distinct facturé par Send By Me. Le détail du prix
          total, toutes taxes et frais compris, est affiché avant l&apos;envoi de la demande et avant le paiement.
        </p>
      </section>

      <section>
        <h2>7. Paiement et versement au voyageur</h2>
        <ul>
          <li>
            Tous les paiements passent par le service, via notre prestataire Stripe. Tout paiement en dehors du service, en espèces ou
            autrement, est interdit et prive les membres de toute assistance.
          </li>
          <li>
            Les sommes payées sont conservées jusqu&apos;à la validation de la livraison par le code de remise. La part du voyageur lui
            est alors versée sur le moyen de versement qu&apos;il a renseigné (compte bancaire via Stripe, ou autre moyen proposé selon
            son pays de résidence).
          </li>
          <li>Le voyageur doit renseigner un moyen de versement valide et compléter les vérifications demandées par Stripe.</li>
        </ul>
      </section>

      <section>
        <h2>8. Remise et livraison du colis</h2>
        <ul>
          <li>
            L&apos;expéditeur photographie le contenu puis le colis emballé avec son étiquette. Il présente le colis ouvert au voyageur,
            qui en vérifie le contenu avant fermeture.
          </li>
          <li>Le voyageur photographie le colis à la prise en charge, puis à l&apos;arrivée, encore fermé.</li>
          <li>
            Le voyageur remet le colis au destinataire, qui lui communique le code de remise. La saisie du bon code vaut confirmation
            de la livraison. Après 5 codes erronés, la livraison est bloquée jusqu&apos;à intervention du support.
          </li>
          <li>L&apos;expéditeur ne communique le code qu&apos;à son destinataire, jamais au voyageur avant la remise.</li>
        </ul>
      </section>

      <section>
        <h2>9. Engagements de l&apos;expéditeur</h2>
        <ul>
          <li>Décrire le contenu, le poids et la valeur du colis avec exactitude.</li>
          <li>
            N&apos;envoyer aucun objet figurant sur la liste des <Link href="/objets-interdits">objets interdits</Link>, ni aucun objet
            dont l&apos;exportation ou l&apos;importation est interdite ou soumise à autorisation.
          </li>
          <li>Ne pas confier d&apos;objets de grande valeur, d&apos;espèces ou de documents irremplaçables.</li>
          <li>Indiquer un destinataire joignable et lui transmettre le code de remise.</li>
        </ul>
      </section>

      <section>
        <h2>10. Engagements du voyageur</h2>
        <ul>
          <li>Publier uniquement des trajets réels et respecter les kilos et la date annoncés.</li>
          <li>Vérifier le contenu de chaque colis avant de le fermer et refuser tout objet interdit, douteux ou non conforme.</li>
          <li>Respecter les règles de sa compagnie de transport, de la douane et des pays traversés, y compris les déclarations requises.</li>
          <li>Prendre soin du colis et le remettre uniquement au destinataire, contre le code de remise.</li>
          <li>Prévenir l&apos;expéditeur et le support sans délai en cas de retard, d&apos;annulation ou d&apos;incident.</li>
        </ul>
      </section>

      <section>
        <h2>11. Annulation et remboursement</h2>
        <ul>
          <li>Avant paiement, l&apos;expéditeur peut annuler sa demande sans frais.</li>
          <li>
            Après paiement et avant la prise en charge du colis, l&apos;expéditeur demande l&apos;annulation au support. Le montant payé
            lui est remboursé.
          </li>
          <li>
            Si le voyageur annule son trajet ou si la livraison n&apos;a pas lieu de son fait, l&apos;expéditeur est intégralement
            remboursé.
          </li>
          <li>Un trajet ayant des réservations confirmées ne peut être annulé qu&apos;en passant par le support.</li>
          <li>Les remboursements sont effectués sur le moyen de paiement utilisé, généralement sous 5 à 10 jours ouvrés.</li>
        </ul>
      </section>

      <section>
        <h2>12. Droit de rétractation</h2>
        <p>
          Le service de mise en relation est exécuté dès la confirmation de la réservation, à la demande expresse de l&apos;expéditeur.
          Conformément à l&apos;article L221-28 du Code de la consommation, le droit de rétractation ne s&apos;applique plus une fois ce
          service pleinement exécuté. Les conditions d&apos;annulation de l&apos;article 11 restent applicables. Le contrat de transport
          conclu entre deux particuliers n&apos;ouvre pas de droit de rétractation.
        </p>
      </section>

      <section>
        <h2>13. Classement des trajets et mise en avant</h2>
        <p>
          Les résultats de recherche affichent d&apos;abord les trajets mis en avant, puis les autres trajets par date de départ, de la
          plus proche à la plus lointaine. Un voyageur peut mettre son trajet en avant pour {euros(BOOST_FEE_CENTS)}, retenu sur son
          premier versement pour ce trajet (rien n&apos;est dû sans réservation) ; la mise en avant est offerte aux membres du programme
          Ambassadeur. Les trajets concernés portent la mention « Mis en avant ».
        </p>
      </section>

      <section>
        <h2>14. Avis</h2>
        <p>
          Seuls l&apos;expéditeur et le voyageur d&apos;une réservation livrée peuvent laisser un avis, une fois chacun. Les avis ne
          donnent lieu à aucune contrepartie. Send By Me ne les modifie pas et ne les supprime qu&apos;en cas de contenu illicite,
          injurieux ou sans rapport avec la réservation, après signalement. Un membre ne peut pas supprimer un avis reçu.
        </p>
      </section>

      <section>
        <h2>15. Parrainage et programme Ambassadeur</h2>
        <p>
          Un filleul reçoit un crédit de {euros(REFERRAL_REWARD_CENTS)} à l&apos;inscription et son parrain le même crédit après la
          première livraison du filleul. Ce crédit s&apos;impute sur les frais de service, n&apos;est pas remboursable en espèces et
          expire avec le compte. Les conditions du programme Ambassadeur sont affichées dans l&apos;espace membre. Send By Me peut
          annuler les avantages obtenus par fraude.
        </p>
      </section>

      <section>
        <h2>16. Obligations fiscales et sociales</h2>
        <p>
          Les sommes perçues par les voyageurs peuvent être imposables et, au-delà de certains seuils, soumises à cotisations
          sociales. Chaque membre est responsable de ses déclarations. Les informations utiles sont disponibles sur{" "}
          <a href="https://www.impots.gouv.fr" target="_blank" rel="noreferrer">impots.gouv.fr</a> et{" "}
          <a href="https://www.urssaf.fr" target="_blank" rel="noreferrer">urssaf.fr</a>. Conformément à l&apos;article 242 bis du Code
          général des impôts, Send By Me adresse chaque année, avant le 31 janvier, un récapitulatif des sommes perçues à chaque
          voyageur concerné et transmet à l&apos;administration fiscale les informations exigées par la loi.
        </p>
      </section>

      <section>
        <h2>17. Responsabilité</h2>
        <ul>
          <li>
            Chaque membre est responsable de ses annonces, de ses déclarations et du respect de la loi. L&apos;expéditeur répond du
            contenu de son colis ; le voyageur, du colis qui lui est confié.
          </li>
          <li>
            Les colis ne sont pas assurés par Send By Me. Send By Me ne répond pas des retards, pertes, dommages ou saisies survenant
            pendant le transport, sauf faute de sa part.
          </li>
          <li>
            En cas de litige, Send By Me examine les photos, les messages et les étapes de suivi, et peut rembourser l&apos;expéditeur
            ou suspendre le versement au voyageur.
          </li>
          <li>Rien dans ces conditions ne limite les droits que la loi reconnaît aux consommateurs.</li>
        </ul>
      </section>

      <section>
        <h2>18. Signalement, suspension et fermeture du compte</h2>
        <p>
          Tout membre peut signaler une annonce, un message, un avis ou un comportement depuis le service. Send By Me peut retirer un
          contenu, suspendre ou fermer un compte en cas de fraude, de contenu illicite, de manquement à ces conditions ou de
          signalements répétés, après en avoir informé le membre sauf urgence. Un membre peut fermer son compte à tout moment en
          écrivant à <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>, une fois ses réservations en cours terminées.
        </p>
      </section>

      <section>
        <h2>19. Données personnelles</h2>
        <p>
          Le traitement des données est décrit dans la <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
      </section>

      <section>
        <h2>20. Modification des conditions</h2>
        <p>
          Send By Me peut modifier ces conditions. Les membres sont prévenus au moins 15 jours avant l&apos;entrée en vigueur d&apos;une
          modification importante. Les réservations déjà payées restent régies par la version en vigueur au moment du paiement.
        </p>
      </section>

      <section>
        <h2>21. Litiges et droit applicable</h2>
        <p>
          Ces conditions sont soumises au droit français. En cas de réclamation, écrivez d&apos;abord à{" "}
          <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>. Si le litige avec Send By Me n&apos;est pas résolu sous 2 mois, le
          consommateur peut saisir gratuitement le médiateur de la consommation : {MEDIATOR.name}, {MEDIATOR.website}. À défaut
          d&apos;accord, les tribunaux compétents sont ceux désignés par la loi. Les litiges entre membres relèvent d&apos;eux seuls ;
          Send By Me les aide à les résoudre à l&apos;aide des éléments de suivi.
        </p>
      </section>

      <section>
        <h2>22. Contact</h2>
        <p>
          <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>
        </p>
      </section>
    </ProsePage>
  );
}
