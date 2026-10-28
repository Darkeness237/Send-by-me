import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Objets interdits"),
    description: t("La liste des objets qu'il est interdit d'envoyer avec un voyageur Send By Me."),
    alternates: { canonical: "/objets-interdits" },
  };
}

export default async function Forbidden() {
  const t = await getT();
  return (
    <ProsePage
      title={t("Objets interdits")}
      intro={t("Le voyageur est responsable de ce qu'il transporte devant les douanes et la compagnie. Ces objets sont refusés sur Send By Me, sans exception.")}
    >
      <section>
        <h2>{t("Toujours interdits")}</h2>
        <ul>
          <li>{t("Argent liquide, chèques, cartes bancaires, métaux précieux et bijoux de valeur")}</li>
          <li>{t("Stupéfiants, produits illicites ou contrefaits")}</li>
          <li>{t("Armes, munitions, couteaux, objets coupants, répliques d'armes")}</li>
          <li>{t("Produits inflammables ou explosifs : gaz, briquets, aérosols, batteries lithium en vrac")}</li>
          <li>{t("Produits chimiques, corrosifs ou toxiques")}</li>
          <li>{t("Animaux, plantes et semences")}</li>
          <li>{t("Documents d'identité d'une autre personne")}</li>
        </ul>
      </section>
      <section>
        <h2>{t("Autorisés sous conditions")}</h2>
        <ul>
          <li>{t("Liquides et cosmétiques : contenants de 100 ml maximum en avion, dans un sac fermé")}</li>
          <li>{t("Médicaments : uniquement avec l'ordonnance au nom du destinataire")}</li>
          <li>{t("Nourriture : produits secs, emballés et non périssables, selon les règles du pays d'arrivée")}</li>
          <li>{t("Électronique : appareils neufs ou d'occasion avec leur facture, valeur déclarée au voyageur")}</li>
        </ul>
      </section>
      <section>
        <h2>{t("Douanes")}</h2>
        <p>
          {t("Chaque pays a ses propres règles d'importation. En cas de doute, renseignez-vous auprès des douanes du pays d'arrivée avant d'envoyer votre demande.")}
        </p>
      </section>
    </ProsePage>
  );
}
