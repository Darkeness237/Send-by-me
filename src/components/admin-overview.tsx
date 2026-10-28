import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeCheck, Banknote, Euro, PiggyBank, Gift, Package, Plane, Truck, UserPlus, Users, type LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { dayLabel } from "@/lib/format";
import { codeFor } from "@/lib/places";
import { euros } from "@/lib/pricing";
import { getFinances } from "@/lib/finance";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUS_LABEL, type BookingStatus } from "@/lib/types";

const DAY = 86_400_000;
// Page d'administration rendue à chaque visite : l'heure courante fait partie de la requête.
const nowMs = () => new Date().getTime();
const PAID: BookingStatus[] = ["paid", "picked_up", "delivered"];
// Ordre du parcours, du dépôt de la demande à la fin.
const FUNNEL: BookingStatus[] = ["pending", "accepted", "paid", "picked_up", "delivered", "declined", "cancelled", "refunded"];

type Queue = { key: string; label: string; count: number; icon: LucideIcon; hint?: string };

function Tile({ icon: Icon, label, value, sub, href }: { icon: LucideIcon; label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <>
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Icon className="h-4 w-4 text-brand" aria-hidden="true" /> {label}
      </p>
      <p className="tabular mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="group block rounded-3xl bg-card p-5 ring-1 ring-line hover:ring-brand">
      {body}
    </Link>
  ) : (
    <div className="rounded-3xl bg-card p-5 ring-1 ring-line">{body}</div>
  );
}

/** Paiements encaissés par jour sur 30 jours : barres fines, une seule série, infobulle au survol. */
function DailyBars({ days }: { days: { date: string; cents: number; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.cents));
  const W = 600, H = 160, gap = 2, bw = (W - gap * (days.length - 1)) / days.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="h-auto w-full" role="img" aria-label="Montant payé par jour sur les 30 derniers jours">
        {[0.5, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={H - H * f} y2={H - H * f} stroke="var(--color-line)" strokeDasharray="3 4" />
        ))}
        <line x1="0" x2={W} y1={H} y2={H} stroke="var(--color-line)" />
        {days.map((d, i) => {
          const h = d.cents ? Math.max(4, (d.cents / max) * (H - 8)) : 0;
          const x = i * (bw + gap);
          return (
            <g key={d.date}>
              {/* Zone de survol plus large que la barre */}
              <rect x={x} y="0" width={bw} height={H} fill="transparent">
                <title>{`${dayLabel(d.date)} : ${euros(d.cents)} · ${d.count} paiement${d.count > 1 ? "s" : ""}`}</title>
              </rect>
              {h > 0 && <rect x={x} y={H - h} width={bw} height={h} rx="3" fill="var(--color-brand)" pointerEvents="none" />}
            </g>
          );
        })}
        <text x="0" y={H + 16} className="fill-[var(--color-muted)] text-[11px]">
          {dayLabel(days[0].date)}
        </text>
        <text x={W} y={H + 16} textAnchor="end" className="fill-[var(--color-muted)] text-[11px]">
          {"aujourd'hui"}
        </text>
        <text x="4" y="12" className="fill-[var(--color-muted)] text-[11px]">
          {euros(max)}
        </text>
      </svg>
    </figure>
  );
}

export async function AdminOverview({ queues }: { queues: Queue[] }) {
  const db = createAdminClient();
  const now = nowMs();
  const since = new Date(now - 30 * DAY).toISOString();
  const fin = await getFinances("30j", now);
  const [{ data: all }, { count: members }, { count: newMembers }, { count: verified }, { count: upcoming }, { data: recent }, { data: newcomers }, { data: dueRows }] = await Promise.all([
    db.from("bookings").select("status, total_cents, paid_at, trip:trips(from_city, to_city)").limit(5000),
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("id_verified", true),
    db.from("trips").select("id", { count: "exact", head: true }).eq("status", "published").gt("departure_at", new Date(now).toISOString()),
    db.from("bookings").select("id, status, total_cents, created_at, trip:trips(from_city, to_city)").order("created_at", { ascending: false }).limit(8),
    db.from("profiles").select("id, full_name, city, id_verified, created_at").order("created_at", { ascending: false }).limit(6),
    db.from("bookings").select("base_cents").eq("payout_status", "due"),
  ]);

  const rows = (all ?? []) as { status: BookingStatus; total_cents: number; paid_at: string | null; trip: unknown }[];
  const paid30 = rows.filter((r) => r.paid_at && r.paid_at >= since && PAID.includes(r.status));
  const volume30 = paid30.reduce((a, r) => a + r.total_cents, 0);
  const delivered = rows.filter((r) => r.status === "delivered").length;
  const failed = rows.filter((r) => r.status === "refunded").length;
  const dueCents = (dueRows ?? []).reduce((a, r) => a + (r.base_cents as number), 0);

  // 30 jours, du plus ancien à aujourd'hui (jour calendaire UTC).
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now - (29 - i) * DAY).toISOString().slice(0, 10);
    const list = paid30.filter((r) => r.paid_at!.slice(0, 10) === date);
    return { date: `${date}T12:00:00Z`, cents: list.reduce((a, r) => a + r.total_cents, 0), count: list.length };
  });

  const byStatus = FUNNEL.map((s) => ({ status: s, n: rows.filter((r) => r.status === s).length }));
  const maxStatus = Math.max(1, ...byStatus.map((s) => s.n));

  const lines = new Map<string, number>();
  for (const r of rows.filter((r) => PAID.includes(r.status))) {
    const t = (Array.isArray(r.trip) ? r.trip[0] : r.trip) as { from_city: string; to_city: string } | null;
    if (!t) continue;
    const k = `${codeFor(t.from_city)} › ${codeFor(t.to_city)}`;
    lines.set(k, (lines.get(k) ?? 0) + 1);
  }
  const topLines = [...lines.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const todo = queues.filter((q) => q.count > 0);

  return (
    <div className="space-y-6">
      {/* À traiter */}
      <section aria-labelledby="todo">
        <h2 id="todo" className="text-lg font-bold">
          À traiter
        </h2>
        {todo.length ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todo.map((q) => (
              <li key={q.key}>
                <Link href={`/admin?onglet=${q.key}`} className="group flex items-center gap-4 rounded-3xl bg-card p-5 ring-1 ring-line hover:ring-brand">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-signal/15 text-signal-deep">
                    <q.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="tabular block text-2xl font-extrabold">{q.count}</span>
                    <span className="block text-sm text-muted">
                      {q.label}
                      {q.hint ? ` · ${q.hint}` : ""}
                    </span>
                  </span>
                  <ArrowRight className="h-5 w-5 text-muted transition group-hover:translate-x-1 group-hover:text-brand" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex items-center gap-2 rounded-3xl bg-ok-pale px-5 py-4 font-semibold text-ok">
            <BadgeCheck className="h-5 w-5" aria-hidden="true" /> Rien en attente : tout est à jour.
          </p>
        )}
      </section>

      {/* Chiffres clés */}
      <section aria-label="Chiffres clés" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={Euro} label="Encaissé (30 jours)" value={euros(volume30)} sub={`${paid30.length} réservation${paid30.length > 1 ? "s" : ""} payée${paid30.length > 1 ? "s" : ""}`} />
        <Tile
          icon={PiggyBank}
          label="Résultat net estimé (30 j)"
          value={euros(fin.net)}
          sub={`Revenus ${euros(fin.revenue)} − coûts ${euros(fin.stripe + fin.partner + fin.rewards + fin.expensesTotal)} · voir le détail →`}
          href="/admin?onglet=finances"
        />
        <Tile icon={Users} label="Membres" value={String(members ?? 0)} sub={`+${newMembers ?? 0} ce mois · ${verified ?? 0} vérifiés`} />
        <Tile icon={Plane} label="Trajets à venir" value={String(upcoming ?? 0)} sub={`${delivered} livraison${delivered > 1 ? "s" : ""} réussie${delivered > 1 ? "s" : ""}${failed ? ` · ${failed} remboursée${failed > 1 ? "s" : ""}` : ""}`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6" aria-labelledby="chart">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="chart" className="font-bold">
              Paiements par jour
            </h2>
            <p className="text-sm text-muted">30 derniers jours · survolez une barre</p>
          </div>
          <div className="mt-4">
            <DailyBars days={days} />
          </div>
        </section>

        <section className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6" aria-labelledby="funnel">
          <h2 id="funnel" className="font-bold">
            Réservations par étape
          </h2>
          <ul className="mt-4 space-y-2.5">
            {byStatus.map(({ status, n }) => (
              <li key={status} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="truncate text-ink-soft">{STATUS_LABEL[status]}</span>
                <span className="h-2.5 rounded-full bg-paper" aria-hidden="true">
                  {n > 0 && <span className="block h-2.5 rounded-full bg-brand-fill" style={{ width: `${Math.max(3, (n / maxStatus) * 100)}%` }} />}
                </span>
                <span className="tabular text-right font-bold">{n}</span>
              </li>
            ))}
          </ul>
          {dueCents > 0 && (
            <Link href="/admin?onglet=versements" className="mt-5 flex items-center justify-between rounded-2xl bg-paper px-4 py-3 text-sm font-semibold hover:bg-brand-pale">
              <span>À verser aux voyageurs</span>
              <span className="tabular">{euros(dueCents)}</span>
            </Link>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl bg-card ring-1 ring-line lg:col-span-2" aria-labelledby="recent">
          <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
            <h2 id="recent" className="font-bold">
              Dernières réservations
            </h2>
            <Link href="/admin?onglet=reservations" className="text-sm font-semibold text-brand">
              Tout voir
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {((recent ?? []) as { id: string; status: BookingStatus; total_cents: number; created_at: string; trip: unknown }[]).map((b) => {
              const t = (Array.isArray(b.trip) ? b.trip[0] : b.trip) as { from_city: string; to_city: string } | null;
              return (
                <li key={b.id}>
                  <Link href={`/reservations/${b.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-paper sm:px-6">
                    <Package className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                    <span className="wide tabular w-24 font-extrabold">{t ? `${codeFor(t.from_city)} › ${codeFor(t.to_city)}` : "—"}</span>
                    <span className="flex-1 text-sm text-muted">{dayLabel(b.created_at)}</span>
                    <span className="tabular text-sm font-semibold">{euros(b.total_cents)}</span>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              );
            })}
            {!(recent ?? []).length && <li className="px-6 py-6 text-muted">Aucune réservation pour l&apos;instant.</li>}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6" aria-labelledby="lines">
            <h2 id="lines" className="font-bold">
              Lignes les plus réservées
            </h2>
            {topLines.length ? (
              <ol className="mt-3 space-y-2 text-sm">
                {topLines.map(([k, n]) => (
                  <li key={k} className="flex items-center justify-between">
                    <span className="wide tabular font-extrabold">{k}</span>
                    <span className="text-muted">
                      {n} envoi{n > 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-muted">Pas encore d&apos;envoi payé.</p>
            )}
          </section>
          <section className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6" aria-labelledby="new">
            <div className="flex items-center justify-between">
              <h2 id="new" className="font-bold">
                Nouveaux membres
              </h2>
              <Link href="/admin?onglet=membres" className="text-sm font-semibold text-brand">
                Tout voir
              </Link>
            </div>
            <ul className="mt-3 space-y-2.5 text-sm">
              {((newcomers ?? []) as { id: string; full_name: string; city: string | null; id_verified: boolean; created_at: string }[]).map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{m.full_name || "—"}</span>
                  {m.id_verified && <BadgeCheck className="h-4 w-4 text-brand" aria-label="Identité vérifiée" />}
                  <span className="text-muted">{dayLabel(m.created_at)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export const QUEUE_ICONS = { verifications: BadgeCheck, signalements: AlertTriangle, livraisons: Truck, versements: Banknote, primes: Gift } as const;
