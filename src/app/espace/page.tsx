import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  BadgeCheck,
  Bell,
  Check,
  ChevronRight,
  CircleDashed,
  CreditCard,
  Gift,
  LogOut,
  MapPinned,
  MessageCircle,
  Package,
  PackagePlus,
  Plane,
  Plus,
  Shield,
  Trash2,
  UserRound,
  X,
  Award,
} from "lucide-react";
import { deleteAlert } from "@/app/actions/account";
import { acceptBooking, declineBooking } from "@/app/actions/bookings";
import { cancelTrip } from "@/app/actions/trips";
import { signOut } from "@/app/actions/auth";
import { Avatar } from "@/components/avatar";
import { RouteArc } from "@/components/journey";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { RequestCard } from "@/components/request-card";
import { getCreditBalance, getMyAlerts, getMyRequests, getMySendings, getMyTrips, getProfile, getUnreadCount } from "@/lib/data";
import { dayLabel, kg } from "@/lib/format";
import { codeFor, tzFor } from "@/lib/places";
import { euros } from "@/lib/pricing";
import { getSession } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";

export const metadata: Metadata = { title: "Mon espace", robots: { index: false } };

const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

async function Dashboard({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const { userId, isAdmin } = await getSession();
  if (!userId) redirect("/connexion?suite=/espace");
  const { onglet } = await searchParams;
  const [profile, sendings, trips, alerts, requests, unread, credit] = await Promise.all([
    getProfile(userId),
    getMySendings(userId),
    getMyTrips(userId),
    getMyAlerts(userId),
    getMyRequests(userId),
    getUnreadCount(userId),
    getCreditBalance(userId),
  ]);

  const pending = trips.flatMap((t) => t.bookings.map((b) => ({ ...b, trip: t }))).filter((b) => b.status === "pending");
  const toPay = sendings.filter((b) => b.status === "accepted");
  const openRequests = requests.filter((r) => r.status === "open");
  // Sans onglet choisi : on ouvre celui où il y a quelque chose à faire.
  const tab =
    onglet === "trajets" || onglet === "demandes" || onglet === "envois"
      ? onglet
      : pending.length || (trips.length && !sendings.length)
        ? "trajets"
        : !sendings.length && openRequests.length
          ? "demandes"
          : "envois";

  const firstName = profile?.full_name?.split(" ")[0] || "";
  const checklist = [
    { done: !!profile?.avatar_url, label: "Photo de profil" },
    { done: !!profile?.id_verified, label: "Identité vérifiée" },
    { done: !!profile?.address_verified, label: "Adresse vérifiée" },
  ];
  const progress = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const todo = pending.length + toPay.length + (unread ? 1 : 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      {/* En-tête */}
      <section className="reveal relative overflow-hidden rounded-[28px] bg-ink px-6 py-7 text-white sm:px-8">
        <RouteArc className="float-y pointer-events-none absolute -top-3 right-[34%] hidden w-64 opacity-40 lg:block" />
        <div className="relative flex flex-wrap items-center gap-5">
          <Avatar name={profile?.full_name || "?"} src={profile?.avatar_url} verified={profile?.id_verified} certified={profile?.certified} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="display text-3xl sm:text-4xl">Bonjour {firstName}</h1>
            <p className="mt-1 text-white/75">
              {todo ? `${plural(todo, "chose demande", "choses demandent")} votre attention.` : "Tout est à jour. Bon voyage !"}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <ButtonLink href="/demandes/nouvelle" size="sm" className="flex-1 sm:flex-none">
              <PackagePlus className="h-4 w-4" aria-hidden="true" /> Envoyer un colis
            </ButtonLink>
            <ButtonLink href="/publier" variant="signal" size="sm" className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4" aria-hidden="true" /> Proposer mes kilos
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 space-y-6">
          {/* À faire */}
          {todo > 0 && (
            <section className="reveal reveal-delay-1 rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6" aria-labelledby="a-faire">
              <h2 id="a-faire" className="flex items-center gap-2 text-lg font-bold">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-signal" aria-hidden="true" /> À faire
              </h2>
              <ul className="mt-4 space-y-3">
                {pending.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-paper p-4">
                    <Package className="h-9 w-9 shrink-0 rounded-xl bg-white p-2 text-brand" aria-hidden="true" />
                    <Link href={`/reservations/${b.id}`} className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {b.sender?.full_name ?? "Un expéditeur"} veut envoyer {kg(b.weight_kg)}
                      </p>
                      <p className="truncate text-sm text-muted">
                        {codeFor(b.trip.from_city)} → {codeFor(b.trip.to_city)} · {catLabel(b.category)}
                      </p>
                    </Link>
                    <div className="flex w-full gap-2 sm:w-auto">
                      <form action={declineBooking.bind(null, b.id)} className="flex-1 sm:flex-none">
                        <Button variant="outline" size="sm" type="submit" className="w-full">
                          <X className="h-4 w-4" aria-hidden="true" /> Refuser
                        </Button>
                      </form>
                      <form action={acceptBooking.bind(null, b.id)} className="flex-1 sm:flex-none">
                        <Button size="sm" type="submit" className="w-full">
                          <Check className="h-4 w-4" aria-hidden="true" /> Accepter
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
                {toPay.map((b) => (
                  <li key={b.id}>
                    <Link href={`/reservations/${b.id}`} className="flex items-center gap-3 rounded-2xl bg-paper p-4 hover:ring-1 hover:ring-brand/40">
                      <CreditCard className="h-9 w-9 shrink-0 rounded-xl bg-white p-2 text-signal-deep" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">Votre demande est acceptée, il reste à payer</span>
                        <span className="block truncate text-sm text-muted">
                          {codeFor(b.trip?.from_city ?? "")} → {codeFor(b.trip?.to_city ?? "")} · {euros(b.total_cents)}
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
                {unread > 0 && (
                  <li>
                    <Link href="/messages" className="flex items-center gap-3 rounded-2xl bg-paper p-4 hover:ring-1 hover:ring-brand/40">
                      <MessageCircle className="h-9 w-9 shrink-0 rounded-xl bg-white p-2 text-brand" aria-hidden="true" />
                      <span className="flex-1 font-semibold">{plural(unread, "message non lu", "messages non lus")}</span>
                      <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
                    </Link>
                  </li>
                )}
              </ul>
            </section>
          )}

          {/* Onglets */}
          <nav className="reveal reveal-delay-2 grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 ring-1 ring-line" aria-label="Sections">
            {(
              [
                ["envois", "envois", sendings.length, Package],
                ["trajets", "trajets", trips.length, Plane],
                ["demandes", "demandes", openRequests.length, MapPinned],
              ] as const
            ).map(([key, label, n, Icon]) => (
              <Link
                key={key}
                href={`/espace?onglet=${key}`}
                aria-current={tab === key ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center text-sm font-semibold transition sm:flex-row sm:justify-center sm:gap-2 ${tab === key ? "bg-ink text-white" : "text-ink-soft hover:bg-paper"}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>
                  <span className="max-sm:hidden">Mes </span>
                  <span className="max-sm:capitalize">{label}</span> <span className="tabular opacity-60">{n}</span>
                </span>
              </Link>
            ))}
          </nav>

          {tab === "demandes" ? (
            <section className="space-y-3">
              {requests.length === 0 ? (
                <Empty icon={MapPinned} title="Aucune demande publiée" text="Décrivez votre colis, les voyageurs qui partent sur votre ligne vous contactent.">
                  <ButtonLink href="/demandes/nouvelle" className="mt-6">
                    Publier une demande
                  </ButtonLink>
                </Empty>
              ) : (
                <>
                  {requests.map((r) => (
                    <RequestCard key={r.id} r={r} />
                  ))}
                  <ButtonLink href="/demandes/nouvelle" variant="outline" size="sm">
                    <Plus className="h-4 w-4" aria-hidden="true" /> Nouvelle demande
                  </ButtonLink>
                </>
              )}
            </section>
          ) : tab === "envois" ? (
            <section className="space-y-3">
              {sendings.length === 0 && (
                <Empty icon={Package} title="Aucun envoi pour l'instant" text="Trouvez un voyageur qui part vers votre destinataire, ou publiez une demande.">
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <ButtonLink href="/recherche">Trouver un voyageur</ButtonLink>
                    <ButtonLink href="/demandes/nouvelle" variant="outline">
                      Publier une demande
                    </ButtonLink>
                  </div>
                </Empty>
              )}
              {sendings.map((b) => (
                <Link key={b.id} href={`/reservations/${b.id}`} className="group flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:ring-brand/50 sm:p-5">
                  <div className="wide tabular w-20 shrink-0 text-lg font-extrabold sm:w-24">
                    {codeFor(b.trip?.from_city ?? "")}
                    <span className="text-muted"> › </span>
                    {codeFor(b.trip?.to_city ?? "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {kg(b.weight_kg)} · {catLabel(b.category)}
                    </p>
                    <p className="truncate text-sm text-muted first-letter:uppercase">
                      {b.trip ? dayLabel(b.trip.departure_at, tzFor(b.trip.from_city)) : ""} · avec {b.trip?.traveler?.full_name ?? "voyageur"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge status={b.status} />
                    <span className="tabular text-sm font-semibold">{euros(b.total_cents)}</span>
                  </div>
                  <ChevronRight className="hidden h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5 sm:block" aria-hidden="true" />
                </Link>
              ))}
            </section>
          ) : (
            <section className="space-y-4">
              {trips.length === 0 && (
                <Empty icon={Plane} title="Vous n'avez publié aucun trajet" text="Vous partez bientôt ? Proposez vos kilos libres et fixez votre prix.">
                  <ButtonLink href="/publier" variant="signal" className="mt-6">
                    Proposer mes kilos
                  </ButtonLink>
                </Empty>
              )}
              {trips.map((t) => {
                const filled = t.capacity_kg ? Math.min(100, (t.reserved_kg / t.capacity_kg) * 100) : 0;
                return (
                  <article key={t.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
                    <Link href={`/trajets/${t.id}`} className="block p-4 hover:bg-paper/50 sm:p-5">
                      <div className="flex items-center gap-4">
                        <div className="wide tabular text-xl font-extrabold">
                          {codeFor(t.from_city)} <span className="text-muted">›</span> {codeFor(t.to_city)}
                        </div>
                        <p className="min-w-0 flex-1 truncate text-sm text-muted first-letter:uppercase">{dayLabel(t.departure_at, tzFor(t.from_city))}</p>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
                          <span className="block h-full rounded-full bg-brand" style={{ width: `${filled}%` }} />
                        </span>
                        <span className="tabular text-sm font-semibold">
                          {kg(t.reserved_kg)} / {kg(t.capacity_kg)} réservés
                        </span>
                      </div>
                    </Link>
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
                  </article>
                );
              })}
            </section>
          )}
        </div>

        {/* Colonne compte */}
        <aside className="reveal reveal-delay-3 space-y-4">
          {progress < 100 && (
            <section className="rounded-3xl bg-white p-5 ring-1 ring-line">
              <div className="flex items-baseline justify-between">
                <h2 className="font-bold">Votre profil</h2>
                <span className="tabular text-sm font-bold text-brand">{progress} %</span>
              </div>
              <span className="mt-3 block h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
              </span>
              <ul className="mt-4 space-y-2 text-sm">
                {checklist.map((c) => (
                  <li key={c.label} className={`flex items-center gap-2 ${c.done ? "text-muted line-through" : "font-semibold"}`}>
                    {c.done ? <BadgeCheck className="h-4 w-4 text-ok" aria-hidden="true" /> : <CircleDashed className="h-4 w-4 text-muted" aria-hidden="true" />}
                    {c.label}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/espace/profil" size="sm" className="mt-4 w-full">
                Compléter mon profil
              </ButtonLink>
              <p className="mt-2 text-center text-xs text-muted">Les profils vérifiés reçoivent plus de demandes.</p>
            </section>
          )}

          <Link href="/espace/parrainage" className="flex items-center gap-3 rounded-3xl bg-signal p-5 text-ink transition hover:brightness-95">
            <Gift className="h-10 w-10 shrink-0 rounded-xl bg-white/40 p-2" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold">Parrainez vos proches</span>
              <span className="block text-sm text-ink/75">{credit > 0 ? `${euros(credit)} de crédit disponible` : "5 € pour vous, 5 € pour eux"}</span>
            </span>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>

          <Link href="/espace/ambassadeur" className="flex items-center gap-3 rounded-3xl bg-white p-5 ring-1 ring-line transition hover:ring-brand/50">
            <Award className="h-10 w-10 shrink-0 rounded-xl bg-signal/15 p-2 text-signal-deep" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold">Programme Ambassadeur</span>
              <span className="block text-sm text-muted">Primes en argent et annonces en tête pour les voyageurs réguliers</span>
            </span>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>

          {alerts.length > 0 && (
            <section className="rounded-3xl bg-white p-5 ring-1 ring-line" aria-labelledby="alertes">
              <h2 id="alertes" className="flex items-center gap-2 font-bold">
                <Bell className="h-4 w-4 text-brand" aria-hidden="true" /> Mes lignes suivies
              </h2>
              <ul className="mt-2 divide-y divide-line">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 py-2.5">
                    <Link href={`/recherche?from=${encodeURIComponent(a.from_city)}&to=${encodeURIComponent(a.to_city)}`} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {a.from_city} → {a.to_city}
                      </span>
                      <span className={`block text-xs ${a.upcoming ? "font-semibold text-ok" : "text-muted"}`}>
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

          <nav className="overflow-hidden rounded-3xl bg-white ring-1 ring-line" aria-label="Mon compte">
            {(
              [
                ["/espace/profil", UserRound, "Profil et vérification"],
                ["/messages", MessageCircle, unread ? `Messages (${unread})` : "Messages"],
                ["/notifications", Bell, "Notifications"],
                ["/suivi", MapPinned, "Suivre un colis"],
                ...(isAdmin ? [["/admin", Shield, "Administration"] as const] : []),
              ] as const
            ).map(([href, Icon, label]) => (
              <Link key={href} href={href} className="flex items-center gap-3 border-b border-line px-5 py-3.5 text-[15px] font-semibold last:border-0 hover:bg-paper">
                <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
              </Link>
            ))}
            <form action={signOut} className="border-t border-line">
              <button type="submit" className="flex w-full items-center gap-3 px-5 py-3.5 text-[15px] font-semibold text-muted hover:bg-paper hover:text-danger">
                <LogOut className="h-5 w-5" aria-hidden="true" /> Se déconnecter
              </button>
            </form>
          </nav>
        </aside>
      </div>
    </div>
  );
}

function Empty({ icon: Icon, title, text, children }: { icon: typeof Package; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-line">
      <Icon className="float-y mx-auto h-12 w-12 rounded-2xl bg-brand-pale p-2.5 text-brand" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-muted">{text}</p>
      {children}
    </div>
  );
}

export default function SpacePage(props: PageProps<"/espace">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-6xl" />}>
        <Dashboard searchParams={props.searchParams as Promise<{ onglet?: string }>} />
      </Suspense>
    </PageShell>
  );
}
