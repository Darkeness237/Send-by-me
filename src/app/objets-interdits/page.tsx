import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = {
  title: "Objets interdits",
  description: "La liste des objets qu'il est interdit d'envoyer avec un voyageur Send By Me.",
  alternates: { canonical: "/objets-interdits" },
};

export default function Forbidden() {
  return (
    <ProsePage
      title="Objets interdits"
      intro="Le voyageur est responsable de ce qu'il transporte devant les douanes et la compagnie. Ces objets sont refusés sur Send By Me, sans exception."
    >
      <section>
        <h2>Toujours interdits</h2>
        <ul>
          <li>Argent liquide, chèques, cartes bancaires, métaux précieux et bijoux de valeur</li>
          <li>Stupéfiants, produits illicites ou contrefaits</li>
          <li>Armes, munitions, couteaux, objets coupants, répliques d&apos;armes</li>
          <li>Produits inflammables ou explosifs : gaz, briquets, aérosols, batteries lithium en vrac</li>
          <li>Produits chimiques, corrosifs ou toxiques</li>
          <li>Animaux, plantes et semences</li>
          <li>Documents d&apos;identité d&apos;une autre personne</li>
        </ul>
      </section>
      <section>
        <h2>Autorisés sous conditions</h2>
        <ul>
          <li>Liquides et cosmétiques : contenants de 100 ml maximum en avion, dans un sac fermé</li>
          <li>Médicaments : uniquement avec l&apos;ordonnance au nom du destinataire</li>
          <li>Nourriture : produits secs, emballés et non périssables, selon les règles du pays d&apos;arrivée</li>
          <li>Électronique : appareils neufs ou d&apos;occasion avec leur facture, valeur déclarée au voyageur</li>
        </ul>
      </section>
      <section>
        <h2>Douanes</h2>
        <p>
          Chaque pays a ses propres règles d&apos;importation. En cas de doute, renseignez-vous auprès des douanes du pays
          d&apos;arrivée avant d&apos;envoyer votre demande.
        </p>
      </section>
    </ProsePage>
  );
}
