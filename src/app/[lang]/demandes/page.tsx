import type { Metadata } from "next";
import { Suspense } from "react";
import { PackagePlus } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { RequestCard } from "@/components/request-card";
import { ButtonLink } from "@/components/ui/button";
import { listRequests } from "@/lib/data";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Demandes d'envoi"),
    description: t("Des expéditeurs cherchent un voyageur pour leur colis. Voyageurs : proposez votre trajet et rentabilisez vos kilos libres."),
  };
}

async function List({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getT();
  const sp = await searchParams;
  const requests = await listRequests({ from: sp.from, to: sp.to });
  return requests.length ? (
    <ul className="mt-6 space-y-3">
      {requests.map((r) => (
        <li key={r.id}>
          <RequestCard r={r} />
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-8 rounded-3xl bg-card p-8 text-center text-muted ring-1 ring-line">{t("Aucune demande en cours pour cette ligne.")}</p>
  );
}

export default async function RequestsPage(props: PageProps<"/[lang]/demandes">) {
  const t = await getT();
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-3xl sm:text-4xl">{t("Demandes d'envoi")}</h1>
            <p className="mt-2 max-w-xl text-muted">
              {t("Ces expéditeurs cherchent un voyageur. Vous partez sur la même ligne ? Proposez-leur votre trajet.")}
            </p>
          </div>
          <ButtonLink href="/demandes/nouvelle" variant="signal">
            <PackagePlus className="h-4 w-4" aria-hidden="true" />{" "}{t("Publier une demande")}
          </ButtonLink>
        </div>
        <form className="mt-6 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input name="from" placeholder={t("Départ (ex. Paris)")} className="rounded-xl border border-line bg-card px-3.5 py-3 text-[15px]" aria-label={t("Ville de départ")} />
          <input name="to" placeholder={t("Arrivée (ex. Douala)")} className="rounded-xl border border-line bg-card px-3.5 py-3 text-[15px]" aria-label={t("Ville d'arrivée")} />
          <button type="submit" className="rounded-xl bg-night px-5 py-3 font-semibold text-white">
            {t("Filtrer")}
          </button>
        </form>
        <Suspense fallback={<div className="mt-6 h-64 rounded-3xl bg-card ring-1 ring-line" />}>
          <List searchParams={props.searchParams as Promise<Record<string, string | undefined>>} />
        </Suspense>
      </div>
    </PageShell>
  );
}
