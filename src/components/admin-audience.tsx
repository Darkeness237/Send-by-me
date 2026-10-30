import Link from "next/link";
import { Info } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

const PERIODS = [
  ["1", "Aujourd'hui"],
  ["7", "7 jours"],
  ["30", "30 jours"],
  ["90", "90 jours"],
] as const;
export type AudiencePeriod = (typeof PERIODS)[number][0];
export const AUDIENCE_PERIODS = PERIODS.map(([k]) => k) as readonly string[];

type Stats = {
  views: number;
  visitors: number;
  daily: { day: string; views: number; visitors: number }[];
  pages: { path: string; views: number }[];
  sources: { source: string; visitors: number }[];
  devices: { device: string; visitors: number }[];
};

// Pages du site sous un nom lisible ; les autres gardent leur adresse.
const PAGE_NAMES: [RegExp, string][] = [
  [/^\/$/, "Accueil"],
  [/^\/recherche$/, "Recherche de trajets"],
  [/^\/trajets\/.+/, "Page d'un trajet"],
  [/^\/publier$/, "Proposer mes kilos"],
  [/^\/demandes$/, "Demandes d'envoi"],
  [/^\/demandes\/nouvelle$/, "Nouvelle demande"],
  [/^\/demandes\/.+/, "Page d'une demande"],
  [/^\/inscription$/, "Inscription"],
  [/^\/connexion$/, "Connexion"],
  [/^\/espace/, "Espace membre"],
  [/^\/comment-ca-marche$/, "Comment ça marche"],
  [/^\/securite$/, "Sécurité"],
  [/^\/suivi/, "Suivi d'un colis"],
];
const pageName = (p: string) => PAGE_NAMES.find(([re]) => re.test(p))?.[1] ?? p;
const fmt = (n: number) => n.toLocaleString("fr-FR");
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function Bars({ rows, label, value }: { rows: Record<string, unknown>[]; label: (r: Record<string, unknown>) => string; value: (r: Record<string, unknown>) => number }) {
  const max = Math.max(1, ...rows.map(value));
  if (!rows.length) return <p className="text-sm text-muted">Pas encore de données.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={i} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-ink-soft">{label(r)}</span>
          <span className="h-2.5 rounded-full bg-paper" aria-hidden="true">
            <span className="block h-2.5 rounded-full bg-brand-fill" style={{ width: `${Math.max(3, (value(r) / max) * 100)}%` }} />
          </span>
          <span className="tabular text-right font-bold">{fmt(value(r))}</span>
        </li>
      ))}
    </ul>
  );
}

export async function AdminAudience({ period }: { period: AudiencePeriod }) {
  const { data, error } = await createAdminClient().rpc("audience_stats", { p_days: Number(period) });
  const s = (data ?? { views: 0, visitors: 0, daily: [], pages: [], sources: [], devices: [] }) as Stats;
  const maxDay = Math.max(1, ...s.daily.map((d) => d.visitors));
  const perVisit = s.visitors ? (s.views / s.visitors).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "—";

  return (
    <div className="space-y-6">
      <nav aria-label="Période" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {PERIODS.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin?onglet=audience&periode=${k}`}
            aria-current={k === period ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${k === period ? "bg-night text-white ring-night" : "bg-card text-ink-soft ring-line hover:ring-brand"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {error && <p className="rounded-2xl bg-danger-pale px-4 py-3 text-sm text-danger">Statistiques indisponibles pour le moment.</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Visiteurs", fmt(s.visitors), "Personnes différentes (comptées une fois par jour)"],
          ["Pages vues", fmt(s.views), "Toutes les pages ouvertes"],
          ["Pages par visiteur", perVisit, "Plus c'est haut, plus le site intéresse"],
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-3xl bg-card p-5 ring-1 ring-line">
            <p className="text-sm font-semibold text-muted">{label}</p>
            <p className="tabular mt-1 text-3xl font-extrabold">{value}</p>
            <p className="mt-1 text-xs text-muted">{hint}</p>
          </div>
        ))}
      </div>

      {period !== "1" && (
        <section className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6" aria-labelledby="aud-days">
          <h2 id="aud-days" className="font-bold">
            Visiteurs par jour
          </h2>
          {s.daily.length ? (
            <div className="mt-5 flex h-44 items-end gap-1" role="img" aria-label={`Visiteurs par jour sur ${period} jours`}>
              {s.daily.map((d) => (
                <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div className="rounded-t-md bg-brand-fill" style={{ height: `${Math.max(2, (d.visitors / maxDay) * 100)}%` }} title={`${dayLabel(d.day)} : ${d.visitors} visiteurs, ${d.views} pages`} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Pas encore de données.</p>
          )}
          {s.daily.length > 0 && (
            <div className="mt-2 flex justify-between text-xs text-muted">
              <span>{dayLabel(s.daily[0].day)}</span>
              <span>{dayLabel(s.daily[s.daily.length - 1].day)}</span>
            </div>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6 lg:col-span-2" aria-labelledby="aud-pages">
          <h2 id="aud-pages" className="mb-4 font-bold">
            Pages les plus vues
          </h2>
          <Bars rows={s.pages} label={(r) => pageName(String(r.path))} value={(r) => Number(r.views)} />
        </section>
        <div className="space-y-6">
          <section className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6" aria-labelledby="aud-sources">
            <h2 id="aud-sources" className="mb-4 font-bold">
              D&apos;où viennent les visiteurs
            </h2>
            <Bars rows={s.sources} label={(r) => String(r.source)} value={(r) => Number(r.visitors)} />
          </section>
          <section className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6" aria-labelledby="aud-devices">
            <h2 id="aud-devices" className="mb-4 font-bold">
              Appareils
            </h2>
            <Bars rows={s.devices} label={(r) => (r.device === "mobile" ? "Téléphone" : "Ordinateur")} value={(r) => Number(r.visitors)} />
          </section>
        </div>
      </div>

      <p className="flex items-start gap-2 text-sm text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Mesure sans cookie : les robots et les pages d&apos;administration ne sont pas comptés, et aucune donnée ne permet d&apos;identifier un visiteur.
      </p>
    </div>
  );
}
