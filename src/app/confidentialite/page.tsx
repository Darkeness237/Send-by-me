import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Confidentialité", alternates: { canonical: "/confidentialite" } };

export default function Privacy() {
  return (
    <ProsePage title="Politique de confidentialité" intro="Version de travail du 27 octobre 2026. À valider avant le lancement public.">
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
