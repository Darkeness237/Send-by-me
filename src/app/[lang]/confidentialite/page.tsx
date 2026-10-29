import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/prose-page";
import { getT } from "@/i18n/server";
import { LEGAL_UPDATED, PUBLISHER } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Confidentialité"), alternates: { canonical: "/confidentialite" } };
}

export default function Privacy() {
  return (
    <ProsePage frenchOnly title="Politique de confidentialité" intro={`En vigueur au ${LEGAL_UPDATED}.`}>
      <section>
        <h2>Responsable du traitement</h2>
        <p>
          {PUBLISHER.name}, éditeur de Send By Me (voir les <Link href="/mentions-legales">mentions légales</Link>). Contact :{" "}
          <a href="mailto:privacy@send-by-me.com">privacy@send-by-me.com</a>.
        </p>
      </section>
      <section>
        <h2>Données collectées et finalités</h2>
        <ul>
          <li>Compte : prénom, nom, e-mail, mot de passe (chiffré, jamais lisible par l&apos;équipe), ville, photo, pays. Pour gérer votre compte (exécution du contrat).</li>
          <li>Coordonnées : téléphone et adresse, si vous les renseignez. Pour la livraison et les notifications (exécution du contrat).</li>
          <li>
            Vérification d&apos;identité : photo de la pièce d&apos;identité et selfie. Pour lutter contre la fraude et attribuer le badge
            « identité vérifiée » (intérêt légitime de sécurité des membres).
          </li>
          <li>
            Trajets, demandes et réservations : villes, dates, numéro de vol, description et photos des colis, nom et téléphone du
            destinataire. Pour organiser et suivre l&apos;envoi (exécution du contrat).
          </li>
          <li>Messages et appels entre l&apos;expéditeur et le voyageur d&apos;une réservation. Les appels ne sont pas enregistrés.</li>
          <li>
            Paiement et versement : traités par Stripe. Send By Me ne voit ni ne conserve les numéros de carte ; les coordonnées
            bancaires des voyageurs sont transmises à Stripe pour les virements (exécution du contrat, obligations comptables).
          </li>
          <li>Avis et signalements. Pour la confiance entre membres et la modération.</li>
          <li>Données techniques : journaux de connexion, abonnement aux notifications. Pour la sécurité et le fonctionnement du service.</li>
        </ul>
      </section>
      <section>
        <h2>Qui voit quoi</h2>
        <ul>
          <li>Les autres membres voient votre prénom, l&apos;initiale de votre nom, votre ville, votre photo et vos avis.</li>
          <li>Les détails d&apos;une réservation et les messages ne sont visibles que par l&apos;expéditeur et le voyageur concernés.</li>
          <li>Le code de remise n&apos;est visible que par l&apos;expéditeur et son destinataire.</li>
          <li>Les documents d&apos;identité ne sont visibles que par l&apos;équipe chargée de la vérification.</li>
          <li>Votre numéro de téléphone n&apos;est jamais affiché aux autres membres.</li>
        </ul>
      </section>
      <section>
        <h2>Prestataires</h2>
        <p>Nous faisons appel aux prestataires suivants, qui traitent les données pour notre compte :</p>
        <ul>
          <li>Supabase (base de données et comptes, serveurs à Paris) et Netlify (hébergement du site).</li>
          <li>Stripe (paiements et virements).</li>
          <li>Brevo (e-mails et SMS) et Meta (notifications WhatsApp, si vous les activez).</li>
          <li>Google et Facebook, si vous choisissez de vous connecter avec ces comptes.</li>
          <li>Notre partenaire de livraison à domicile, pour les seules livraisons concernées.</li>
        </ul>
        <p>
          Certains de ces prestataires peuvent traiter des données hors de l&apos;Union européenne. Ces transferts sont encadrés par les
          clauses contractuelles types de la Commission européenne ou une décision d&apos;adéquation.
        </p>
      </section>
      <section>
        <h2>Durée de conservation</h2>
        <ul>
          <li>Compte : tant qu&apos;il est actif, puis suppression après 3 ans d&apos;inactivité.</li>
          <li>Documents d&apos;identité : supprimés dès la vérification terminée, sauf litige en cours.</li>
          <li>Réservations, paiements et factures : 10 ans, au titre des obligations comptables.</li>
          <li>Messages et photos des colis : 1 an après la livraison, pour le traitement des litiges.</li>
        </ul>
      </section>
      <section>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez accéder à vos données, les corriger, les faire supprimer, en limiter le traitement, vous y opposer ou les
          récupérer, en écrivant à <a href="mailto:privacy@send-by-me.com">privacy@send-by-me.com</a>. Nous répondons sous un mois. Vous
          pouvez aussi introduire une réclamation auprès de la CNIL (www.cnil.fr).
        </p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>
          Le site n&apos;utilise que des cookies nécessaires à son fonctionnement (session de connexion, langue, thème). Ils ne
          nécessitent pas de consentement.
        </p>
      </section>
    </ProsePage>
  );
}
