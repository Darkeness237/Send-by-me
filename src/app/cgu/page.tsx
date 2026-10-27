import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Conditions d'utilisation", alternates: { canonical: "/cgu" } };

// Base de travail : à faire relire par un juriste avant le lancement public.
export default function Terms() {
  return (
    <ProsePage title="Conditions d'utilisation" intro="Version de travail du 27 octobre 2026. Ce texte doit être validé par un juriste avant le lancement public.">
      <section>
        <h2>1. Le service</h2>
        <p>
          Send By Me est une plateforme de mise en relation entre des expéditeurs et des voyageurs particuliers. Send By Me
          n&apos;est pas transporteur : le transport est réalisé par le voyageur, sous sa responsabilité.
        </p>
      </section>
      <section>
        <h2>2. Inscription</h2>
        <p>Il faut avoir 18 ans et fournir des informations exactes. Chaque membre est responsable de la confidentialité de son mot de passe.</p>
      </section>
      <section>
        <h2>3. Obligations de l&apos;expéditeur</h2>
        <ul>
          <li>Décrire honnêtement le contenu du colis et le présenter ouvert au voyageur.</li>
          <li>N&apos;envoyer aucun objet figurant sur la liste des objets interdits.</li>
          <li>Payer uniquement via la plateforme.</li>
        </ul>
      </section>
      <section>
        <h2>4. Obligations du voyageur</h2>
        <ul>
          <li>Publier des trajets réels et respecter les kilos annoncés.</li>
          <li>Contrôler le contenu des colis et refuser tout objet interdit.</li>
          <li>Remettre le colis au destinataire indiqué, contre le code de remise.</li>
          <li>Déclarer ses revenus selon la réglementation fiscale applicable.</li>
        </ul>
      </section>
      <section>
        <h2>5. Paiement et frais</h2>
        <p>
          L&apos;expéditeur paie le prix fixé par le voyageur et des frais de service de 12 % (2 € minimum). Les fonds sont conservés
          jusqu&apos;à la validation de la remise, puis versés au voyageur. En cas de non-livraison avérée, l&apos;expéditeur est remboursé.
        </p>
      </section>
      <section>
        <h2>6. Annulation</h2>
        <p>
          Une demande peut être annulée sans frais avant paiement. Après paiement et avant la remise du colis, l&apos;annulation se
          fait auprès du support, qui procède au remboursement.
        </p>
      </section>
      <section>
        <h2>7. Suspension</h2>
        <p>Send By Me peut suspendre un compte en cas de fraude, de manquement à ces conditions ou de signalements répétés.</p>
      </section>
      <section>
        <h2>8. Contact</h2>
        <p>contact@send-by-me.com</p>
      </section>
    </ProsePage>
  );
}
