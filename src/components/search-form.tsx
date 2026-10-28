import { ArrowLeftRight, Search } from "lucide-react";
import { PLACES } from "@/lib/places";
import { getT } from "@/i18n/server";

type Props = {
  defaults?: { from?: string; to?: string; date?: string; kg?: string };
  compact?: boolean;
};

/** Formulaire de recherche (GET, fonctionne sans JavaScript). */
export async function SearchForm({ defaults = {}, compact = false }: Props) {
  const t = await getT();
  const cell = "flex min-w-0 flex-1 flex-col justify-center px-4 py-2.5";
  const label = "text-xs font-semibold text-muted";
  const input = "w-full bg-transparent text-[16px] font-semibold text-ink placeholder:text-muted/60 focus:outline-none";
  return (
    <form
      action="/recherche"
      method="get"
      className={`flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-line md:flex-row md:items-stretch ${compact ? "" : "shadow-[0_20px_50px_-24px_rgb(15_30_61/0.45)]"}`}
    >
      <datalist id="places">
        {PLACES.map((p) => (
          <option key={p.slug} value={p.city}>
            {p.country}
          </option>
        ))}
      </datalist>
      <div className="relative flex flex-col md:flex-[2] md:flex-row">
        <label className={`${cell} border-b border-line md:border-r md:border-b-0`}>
          <span className={label}>{t("Départ")}</span>
          <input name="from" list="places" required defaultValue={defaults.from} placeholder="Paris" className={input} autoComplete="off" />
        </label>
        <span
          className="absolute top-1/2 right-4 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-muted ring-1 ring-line md:left-1/2 md:flex md:-translate-x-1/2"
          aria-hidden="true"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </span>
        <label className={`${cell} border-b border-line md:border-r md:border-b-0 md:pl-7`}>
          <span className={label}>{t("Arrivée")}</span>
          <input name="to" list="places" required defaultValue={defaults.to} placeholder="Douala" className={input} autoComplete="off" />
        </label>
      </div>
      <div className="flex md:flex-[1.3]">
        <label className={`${cell} border-r border-b border-line md:border-b-0`}>
          <span className={label}>{t("À partir du")}</span>
          <input name="date" type="date" defaultValue={defaults.date} className={input} />
        </label>
        <label className={`${cell} max-w-28 border-b border-line md:border-r md:border-b-0`}>
          <span className={label}>{t("Poids")}</span>
          <span className="flex items-baseline gap-1">
            <input name="kg" type="number" min={0.5} max={50} step={0.5} defaultValue={defaults.kg} placeholder="5" className={input} />
            <span className="text-sm text-muted">kg</span>
          </span>
        </label>
      </div>
      <button
        type="submit"
        className="flex h-14 items-center justify-center gap-2 bg-signal px-7 font-bold text-ink transition-colors hover:bg-signal-deep md:h-auto"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
        {t("Rechercher")}
      </button>
    </form>
  );
}
