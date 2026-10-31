import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Confidentialité"), alternates: { canonical: "/confidentialite" } };
}

export default function Privacy() {
  return (
    <ProsePage frenchOnly title="Politique de confidentialité" intro="Version du 31 octobre 2026.">
      <section>
        <h2>Données collectées</h2>
        <ul>
          <li>Compte : nom affiché, e-mail, mot de passe (chiffré, jamais lisible par l&apos;équipe).</li>
          <li>Trajets et réservations : villes, dates, description des colis, nom et téléphone du destinataire.</li>
          <li>Messages échangés entre l&apos;expéditeur et le voyageur d&apos;une réservation.</li>
          <li>Paiement : traité par Stripe. Send By Me ne voit ni ne stocke vos numéros de carte.</li>
        </ul>
      </section>
      <section>
        <h2>Qui voit quoi</h2>
        <ul>
          <li>Votre nom affiché, votre ville et vos avis sont publics.</li>
          <li>Les détails d&apos;une réservation et les messages ne sont visibles que par l&apos;expéditeur et le voyageur concernés.</li>
          <li>Le code de remise n&apos;est visible que par l&apos;expéditeur.</li>
        </ul>
      </section>
      <section>
        <h2 id="cookies">Cookies et traceurs</h2>
        <p>Certains éléments sont indispensables au fonctionnement du site et sont déposés sans demande d&apos;accord :</p>
        <ul>
          <li>Cookies de session (préfixe « sb- ») : vous garder connecté à votre compte. Supprimés à la déconnexion.</li>
          <li>Cookie « sbm_lang » : retenir la langue choisie (1 an).</li>
          <li>Stockage local du navigateur : thème clair ou sombre (« sbm-theme »), animation d&apos;ouverture déjà vue (« sbm-intro », effacé à la fermeture de l&apos;onglet), votre choix sur les cookies publicitaires (« sbm-consent »).</li>
        </ul>
        <p>Cookies publicitaires Google Ads : ils servent à mesurer l&apos;efficacité de nos annonces Google (par exemple, savoir qu&apos;une inscription fait suite à un clic sur une annonce). Ils ne sont déposés que si vous cliquez sur « Accepter » dans la bannière. Si vous refusez, le site fonctionne exactement de la même façon. Vous pouvez changer d&apos;avis à tout moment avec le lien « Cookies » en bas de chaque page. Google conserve ces cookies jusqu&apos;à 13 mois.</p>
        <p>La mesure d&apos;audience (Plausible) et le suivi des erreurs (Sentry) ne déposent aucun cookie et n&apos;utilisent pas d&apos;identifiant permettant de vous suivre d&apos;un site à l&apos;autre. Le paiement se fait sur une page Stripe, qui applique sa propre politique de cookies.</p>
      </section>
      <section>
        <h2>Prestataires</h2>
        <p>Ils traitent des données uniquement pour faire fonctionner Send By Me, selon nos instructions :</p>
        <ul>
          <li>Supabase : base de données, comptes et fichiers (photos, justificatifs).</li>
          <li>Netlify : hébergement du site.</li>
          <li>Stripe : paiements, remboursements, virements aux voyageurs et vérification d&apos;identité.</li>
          <li>Brevo : envoi des e-mails et des SMS (confirmation, notifications, code du destinataire).</li>
          <li>Google : connexion avec un compte Google, si vous la choisissez ; mesure de l&apos;efficacité de nos annonces Google Ads, uniquement si vous acceptez les cookies publicitaires.</li>
          <li>KAMDEM Delivery : livraison à domicile au Cameroun, qui reçoit le nom, le téléphone et l&apos;adresse du destinataire pour les seuls colis concernés.</li>
          <li>Plausible Analytics (hébergé dans l&apos;Union européenne) : statistiques de fréquentation anonymes, sans cookie. Les adresses des pages sont transmises sans identifiant ni paramètre.</li>
          <li>Sentry : détection des erreurs techniques. Les e-mails, numéros de téléphone, IBAN et codes de remise sont retirés avant l&apos;envoi, et aucun enregistrement de votre navigation n&apos;est réalisé.</li>
        </ul>
      </section>
      <section>
        <h2>Durée de conservation</h2>
        <p>Les données de compte sont conservées tant que le compte est actif, puis supprimées sous 3 ans d&apos;inactivité. Les données de paiement sont conservées selon les obligations comptables.</p>
      </section>
      <section>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez accéder à vos données, les corriger ou demander leur suppression en écrivant à privacy@send-by-me.com. Vous
          pouvez aussi saisir la CNIL.
        </p>
      </section>
    </ProsePage>
  );
}
