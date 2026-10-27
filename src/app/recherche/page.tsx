import type { Metadata } from "next";
import { Suspense } from "react";
import { PackageSearch } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { SearchForm } from "@/components/search-form";
import { TripTag } from "@/components/trip-tag";
import { ButtonLink } from "@/components/ui/button";
import { searchTrips } from "@/lib/data";

export const metadata: Metadata = {
  title: "Trouver un voyageur",
  description: "Trouvez un voyageur qui part dans votre direction et réservez des kilos pour votre colis.",
  alternates: { canonical: "/recherche" },
};

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
  const trips = await searchTrips(q);

  const title =
    q.from && q.to ? `${q.from} → ${q.to}` : q.from ? `Départs de ${q.from}` : q.to ? `Arrivées à ${q.to}` : "Prochains trajets";

  return (
    <>
      <div className="mt-8 flex items-baseline justify-between gap-4">
        <h1 className="wide text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <p className="shrink-0 text-sm text-muted">
          {trips.length} trajet{trips.length > 1 ? "s" : ""}
        </p>
      </div>
      {trips.length ? (
        <ul className="mt-5 space-y-4">
          {trips.map((t) => (
            <li key={t.id}>
              <TripTag trip={t} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-line">
          <PackageSearch className="mx-auto h-10 w-10 text-muted" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-bold">Aucun voyageur sur ce trajet pour l&apos;instant</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Essayez une date plus tardive ou une ville voisine. De nouveaux trajets sont publiés chaque jour.
          </p>
          <ButtonLink href="/recherche" variant="outline" className="mt-6">
            Voir tous les trajets
          </ButtonLink>
        </div>
      )}
    </>
  );
}

async function Form({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  return <SearchForm compact defaults={{ from: sp.from, to: sp.to, date: sp.date, kg: sp.kg }} />;
}

export default function SearchPage(props: PageProps<"/recherche">) {
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
