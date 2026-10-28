import type { Metadata } from "next";
import Image from "next/image";
import terminal from "../../../../../public/images/terminal-valise.jpg";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FAQ_ITEMS } from "@/components/faq";
import { PageShell } from "@/components/page-shell";
import { SearchForm } from "@/components/search-form";
import { TripTag } from "@/components/trip-tag";
import { ButtonLink } from "@/components/ui/button";
import { searchTrips } from "@/lib/data";
import { SITE_URL } from "@/lib/env";
import { CORRIDORS, corridorSlug, parseCorridor } from "@/lib/places";
import { getT } from "@/i18n/server";

export function generateStaticParams() {
  return CORRIDORS.map(([a, b]) => ({ corridor: corridorSlug(a, b) }));
}

export async function generateMetadata(props: PageProps<"/[lang]/envoyer-un-colis/[corridor]">): Promise<Metadata> {
  const { corridor } = await props.params;
  const pair = parseCorridor(corridor);
  if (!pair) return {};
  const [from, to] = pair;
  const t = await getT();
  return {
    title: t("Envoyer un colis de {from} à {to}", { from: from.city, to: to.city }),
    description: t("Envoyez un colis de {from} à {to} ({country}) avec un voyageur vérifié. Prix au kilo affiché, remise en main propre.", { from: from.city, to: to.city, country: t(to.country) }),
    alternates: { canonical: `/envoyer-un-colis/${corridor}` },
  };
}

async function Trips({ from, to }: { from: string; to: string }) {
  const t = await getT();
  const trips = await searchTrips({ from, to }, 10);
  if (!trips.length) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-line">
        <p className="font-semibold">{t("Aucun départ publié pour le moment sur cette ligne.")}</p>
        <p className="mt-1 text-muted">{t("Vous partez bientôt ? Soyez le premier à proposer vos kilos.")}</p>
        <ButtonLink href="/publier" variant="signal" className="mt-5">
          {t("Proposer mes kilos")}
        </ButtonLink>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {trips.map((t) => (
        <li key={t.id}>
          <TripTag trip={t} />
        </li>
      ))}
    </ul>
  );
}

export default async function CorridorPage(props: PageProps<"/[lang]/envoyer-un-colis/[corridor]">) {
  const t = await getT();
  const { corridor } = await props.params;
  const pair = parseCorridor(corridor);
  if (!pair) notFound();
  const [from, to] = pair;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: t("Comment envoyer un colis de {city} à {city2} ?", { city: from.city, city2: to.city }),
        acceptedAnswer: {
          "@type": "Answer",
          text: t("Cherchez un voyageur qui part de {city} vers {city2} sur Send By Me, envoyez une demande avec le poids et le contenu, puis payez en ligne. À l'arrivée, votre destinataire reçoit le colis en main propre.", { city: from.city, city2: to.city }),
        },
      },
      ...FAQ_ITEMS.slice(0, 3).map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    ],
    url: `${SITE_URL}/envoyer-un-colis/${corridor}`,
  };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="relative overflow-hidden bg-ink text-white">
        <Image quality={90} src={terminal} alt="" fill priority placeholder="blur" sizes="100vw" className="object-cover object-[50%_30%] opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
          <p className="wide tabular text-lg font-bold text-signal">
            {from.code} › {to.code}
          </p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">
            {t("Envoyer un colis de {city} à {city2}", { city: from.city, city2: to.city })}
          </h1>
          <p className="mt-4 max-w-[60ch] text-lg text-white/75">
            {t("Des voyageurs qui font le trajet {city} – {city2} proposent leurs kilos libres. Remise en main propre à votre destinataire, suivi à chaque étape.", { city: from.city, city2: to.city })}
          </p>
          <div className="mt-8">
            <SearchForm compact defaults={{ from: from.city, to: to.city }} />
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 className="wide mb-5 text-2xl font-extrabold">{t("Prochains départs")}</h2>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-line" />}>
          <Trips from={from.city} to={to.city} />
        </Suspense>

        <div className="mt-14 grid gap-8 text-[15px] leading-relaxed text-ink-soft md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-lg font-bold text-ink">{t("Ce que vous pouvez envoyer")}</h2>
            <p>
              {t("Vêtements, chaussures, documents, livres, cosmétiques sans liquides de plus de 100 ml, électronique avec facture, alimentaire sec emballé. Chaque voyageur précise ce qu'il accepte.")}
            </p>
          </div>
          <div>
            <h2 className="mb-2 text-lg font-bold text-ink">{t("Le prix")}</h2>
            <p>
              {t("Chaque voyageur fixe son prix au kilo, affiché sur sa carte. S'y ajoutent des frais de service dégressifs selon le poids (15 % à 8 %) et 2 € par envoi pour la sécurité et le suivi. Le total est connu avant d'envoyer votre demande.")}
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
