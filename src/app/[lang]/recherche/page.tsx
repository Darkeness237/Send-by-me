import type { Metadata } from "next";
import { Suspense } from "react";
import { Bell, PackageSearch } from "lucide-react";
import { createAlert } from "@/app/actions/account";
import { PageShell } from "@/components/page-shell";
import { SearchForm } from "@/components/search-form";
import { TripTag } from "@/components/trip-tag";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { getMarketPrices, searchTrips } from "@/lib/data";
import { priceGuide, priceLevel } from "@/lib/price-guide";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Trouver un voyageur"),
    description: t("Trouvez un voyageur qui part dans votre direction et réservez des kilos pour votre colis."),
    alternates: { canonical: "/recherche" },
  };
}

type SP = { from?: string; to?: string; date?: string; kg?: string };

function clean(sp: SP) {
  const s = (v?: string) => (typeof v === "string" ? v.slice(0, 80).trim() || undefined : undefined);
  const date = s(sp.date);
  const kg = Number(sp.kg);
  return {
    from: s(sp.from),
    to: s(sp.to),
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    kg: Number.isFinite(kg) && kg > 0 && kg <= 50 ? kg : undefined,
  };
}

async function Results({ searchParams }: { searchParams: Promise<SP> }) {
  const raw = await searchParams;
  const q = clean(raw);
  const [trips, market] = await Promise.all([searchTrips(q), getMarketPrices()]);
  const t = await getT();

  const title =
    q.from && q.to ? `${q.from} → ${q.to}` : q.from ? t("Départs de {city}", { city: q.from }) : q.to ? t("Arrivées à {city}", { city: q.to }) : t("Prochains trajets");

  return (
    <>
      <div className="mt-8 flex items-baseline justify-between gap-4">
        <h1 className="wide text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <p className="shrink-0 text-sm text-muted">
          {t(trips.length > 1 ? "{n} trajets" : "{n} trajet", { n: trips.length })}
        </p>
      </div>
      {trips.length > 0 && q.from && q.to && isSupabaseConfigured && (
        <form action={createAlert.bind(null, q.from, q.to)} className="mt-2">
          <button type="submit" className="flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
            <Bell className="h-4 w-4" aria-hidden="true" /> {t("Suivre cette ligne")}
          </button>
        </form>
      )}
      {trips.length ? (
        <ul className="mt-5 space-y-4">
          {trips.map((trip) => (
            <li key={trip.id}>
              <TripTag trip={trip} goodPrice={priceLevel(trip.price_per_kg_cents, priceGuide(trip.from_city, trip.to_city, trip.mode, market, { from: trip.from_country, to: trip.to_country })) === "attractive"} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-line">
          <PackageSearch className="mx-auto h-10 w-10 text-muted" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-bold">{t("Aucun voyageur sur ce trajet pour l'instant")}</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            {t(q.from && q.to ? "Essayez une date plus tardive ou une ville voisine, ou suivez cette ligne pour voir les nouveaux trajets dans votre espace." : "Essayez une date plus tardive ou une ville voisine.")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {q.from && q.to && isSupabaseConfigured && (
              <form action={createAlert.bind(null, q.from, q.to)}>
                <button type="submit" className={buttonClass("primary")}>
                  <Bell className="h-4 w-4" aria-hidden="true" /> {t("Suivre cette ligne")}
                </button>
              </form>
            )}
            <ButtonLink href="/recherche" variant="outline">
              {t("Voir tous les trajets")}
            </ButtonLink>
          </div>
        </div>
      )}
    </>
  );
}

async function Form({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  return <SearchForm compact defaults={{ from: sp.from, to: sp.to, date: sp.date, kg: sp.kg }} />;
}

export default function SearchPage(props: PageProps<"/[lang]/recherche">) {
  const searchParams = props.searchParams as Promise<SP>;
  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Suspense fallback={<div className="h-[66px] rounded-2xl bg-white ring-1 ring-line" />}>
          <Form searchParams={searchParams} />
        </Suspense>
        <Suspense
          fallback={
            <div className="mt-16 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-white ring-1 ring-line" />
              ))}
            </div>
          }
        >
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </PageShell>
  );
}
