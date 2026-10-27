import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Bell, Check, Gift, MessageCircle, Package, Plane, Shield, Trash2, UserRound, X } from "lucide-react";
import { deleteAlert } from "@/app/actions/account";
import { acceptBooking, declineBooking } from "@/app/actions/bookings";
import { cancelTrip } from "@/app/actions/trips";
import { signOut } from "@/app/actions/auth";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { RequestCard } from "@/components/request-card";
import { getMyAlerts, getMyRequests, getMySendings, getMyTrips, getProfile } from "@/lib/data";
import { dayLabel, kg } from "@/lib/format";
import { codeFor, tzFor } from "@/lib/places";
import { euros } from "@/lib/pricing";
import { getSession } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";

export const metadata: Metadata = { title: "Mon espace", robots: { index: false } };

const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

async function Dashboard({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const { userId, isAdmin } = await getSession();
  if (!userId) redirect("/connexion?suite=/espace");
  const { onglet } = await searchParams;
  const tab = onglet === "trajets" ? "trajets" : onglet === "demandes" ? "demandes" : "envois";
  const [profile, sendings, trips, alerts, requests] = await Promise.all([
    getProfile(userId),
    getMySendings(userId),
    getMyTrips(userId),
    getMyAlerts(userId),
    getMyRequests(userId),
  ]);
  const pendingRequests = trips.flatMap((t) => t.bookings).filter((b) => b.status === "pending").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-4xl">Bonjour {profile?.full_name?.split(" ")[0] || ""}</h1>
          <p className="mt-2 text-muted">
            {pendingRequests
              ? `${pendingRequests} demande${pendingRequests > 1 ? "s" : ""} attend${pendingRequests > 1 ? "ent" : ""} votre réponse.`
              : "Suivez ici vos envois et vos trajets."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <ButtonLink href="/admin" variant="outline" size="sm">
              <Shield className="h-4 w-4" aria-hidden="true" /> Administration
            </ButtonLink>
          )}
          <ButtonLink href="/espace/parrainage" variant="outline" size="sm">
            <Gift className="h-4 w-4" aria-hidden="true" /> Parrainage
          </ButtonLink>
          <ButtonLink href="/messages" variant="outline" size="sm">
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> Messages
          </ButtonLink>
          <ButtonLink href="/espace/profil" variant="outline" size="sm">
            <UserRound className="h-4 w-4" aria-hidden="true" /> Mon profil
          </ButtonLink>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Se déconnecter
            </Button>
          </form>
        </div>
      </div>

      <nav className="mt-8 flex gap-1 rounded-full bg-white p-1 ring-1 ring-line sm:inline-flex" aria-label="Sections">
        {[
          ["envois", "Mes envois", sendings.length],
          ["trajets", "Mes trajets", trips.length],
          ["demandes", "Mes demandes", requests.filter((r) => r.status === "open").length],
        ].map(([key, label, n]) => (
          <Link
            key={key}
            href={`/espace?onglet=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={`flex-1 rounded-full px-5 py-2 text-center text-sm font-semibold ${tab === key ? "bg-ink text-white" : "text-ink-soft hover:bg-paper"}`}
          >
            {label} <span className="tabular opacity-60">{n}</span>
          </Link>
        ))}
      </nav>

      {alerts.length > 0 && (
        <section className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5" aria-labelledby="alertes">
          <h2 id="alertes" className="flex items-center gap-2 text-sm font-bold">
            <Bell className="h-4 w-4 text-brand" aria-hidden="true" /> Mes lignes suivies
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <Link href={`/recherche?from=${encodeURIComponent(a.from_city)}&to=${encodeURIComponent(a.to_city)}`} className="min-w-0 flex-1">
                  <span className="font-semibold">
                    {a.from_city} → {a.to_city}
                  </span>
                  <span className={`ml-2 text-sm ${a.upcoming ? "font-semibold text-ok" : "text-muted"}`}>
                    {a.upcoming ? `${a.upcoming} trajet${a.upcoming > 1 ? "s" : ""} à venir` : "Aucun trajet pour l'instant"}
                  </span>
                </Link>
                <form action={deleteAlert.bind(null, a.id)}>
                  <button type="submit" className="rounded-full p-2 text-muted hover:bg-paper hover:text-danger" aria-label={`Ne plus suivre ${a.from_city} → ${a.to_city}`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "demandes" ? (
        <section className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 ring-1 ring-line">
            <p className="text-ink-soft">Décrivez votre colis : les trajets qui correspondent vous sont proposés.</p>
            <ButtonLink href="/demandes/nouvelle" variant="signal" size="sm">
              Publier une demande
            </ButtonLink>
          </div>
          {requests.map((r) => (
            <RequestCard key={r.id} r={r} />
          ))}
        </section>
      ) : tab === "envois" ? (
        <section className="mt-6 space-y-3">
          {sendings.length === 0 && (
            <div className="rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-line">
              <Package className="mx-auto h-9 w-9 text-muted" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-bold">Aucun envoi pour l&apos;instant</h2>
              <p className="mt-1 text-muted">Trouvez un voyageur qui part vers votre destinataire.</p>
              <ButtonLink href="/recherche" className="mt-6">
                Trouver un voyageur
              </ButtonLink>
            </div>
          )}
          {sendings.map((b) => (
            <Link key={b.id} href={`/reservations/${b.id}`} className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-line hover:ring-brand/50 sm:p-5">
              <div className="wide tabular w-24 shrink-0 text-lg font-extrabold">
                {codeFor(b.trip?.from_city ?? "")}
                <span className="text-muted"> › </span>
                {codeFor(b.trip?.to_city ?? "")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {kg(b.weight_kg)} · {catLabel(b.category)}
                </p>
                <p className="text-sm text-muted capitalize">{b.trip ? dayLabel(b.trip.departure_at, tzFor(b.trip.from_city)) : ""} · avec {b.trip?.traveler?.full_name ?? "voyageur"}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <StatusBadge status={b.status} />
                <span className="tabular text-sm font-semibold">{euros(b.total_cents)}</span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="mt-6 space-y-4">
          {trips.length === 0 && (
            <div className="rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-line">
              <Plane className="mx-auto h-9 w-9 text-muted" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-bold">Vous n&apos;avez publié aucun trajet</h2>
              <p className="mt-1 text-muted">Vous partez bientôt ? Proposez vos kilos libres.</p>
              <ButtonLink href="/publier" variant="signal" className="mt-6">
                Proposer mes kilos
              </ButtonLink>
            </div>
          )}
          {trips.map((t) => (
            <article key={t.id} className="rounded-2xl bg-white ring-1 ring-line">
              <Link href={`/trajets/${t.id}`} className="flex items-center gap-4 p-4 sm:p-5">
                <div className="wide tabular text-xl font-extrabold">
                  {codeFor(t.from_city)} <span className="text-muted">›</span> {codeFor(t.to_city)}
                </div>
                <p className="flex-1 text-sm text-muted capitalize">{dayLabel(t.departure_at, tzFor(t.from_city))}</p>
                <p className="tabular text-sm font-semibold">
                  {kg(t.reserved_kg)} / {kg(t.capacity_kg)}
                </p>
              </Link>
              {t.status === "cancelled" ? (
                <p className="border-t border-line px-4 py-2.5 text-sm text-muted sm:px-5">Trajet annulé</p>
              ) : (
                t.status === "published" &&
                !t.bookings.some((b) => ["accepted", "paid", "picked_up"].includes(b.status)) && (
                  <form action={cancelTrip.bind(null, t.id)} className="border-t border-line px-4 py-2 sm:px-5">
                    <button type="submit" className="text-sm font-semibold text-muted hover:text-danger">
                      Annuler ce trajet
                    </button>
                  </form>
                )
              )}
              {t.bookings.length > 0 && (
                <ul className="divide-y divide-line border-t border-line">
                  {t.bookings.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                      <Link href={`/reservations/${b.id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {b.sender?.full_name ?? "Expéditeur"} · {kg(b.weight_kg)} · {catLabel(b.category)}
                        </p>
                        <p className="truncate text-sm text-muted">{b.description}</p>
                      </Link>
                      {b.status === "pending" ? (
                        <div className="flex gap-2">
                          <form action={declineBooking.bind(null, b.id)}>
                            <Button variant="outline" size="sm" type="submit" aria-label="Refuser">
                              <X className="h-4 w-4" aria-hidden="true" /> Refuser
                            </Button>
                          </form>
                          <form action={acceptBooking.bind(null, b.id)}>
                            <Button size="sm" type="submit">
                              <Check className="h-4 w-4" aria-hidden="true" /> Accepter
                            </Button>
                          </form>
                        </div>
                      ) : (
                        <StatusBadge status={b.status} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default function SpacePage(props: PageProps<"/espace">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-4xl" />}>
        <Dashboard searchParams={props.searchParams as Promise<{ onglet?: string }>} />
      </Suspense>
    </PageShell>
  );
}
