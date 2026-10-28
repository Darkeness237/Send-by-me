import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { setVerified } from "@/app/actions/admin";
import { completeHomeDelivery } from "@/app/actions/tracking";
import { DELIVERY_STATUS_LABEL, type DeliveryStatus } from "@/lib/delivery";
import { PayoutForm, RefundForm, ResolveReportForm, ReviewForm, RewardsPayoutForm } from "@/components/admin-forms";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { buttonClass } from "@/components/ui/button";
import { Avatar } from "@/components/avatar";
import { dayLabel, kg } from "@/lib/format";
import { codeFor } from "@/lib/places";
import { euros } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/supabase/server";
import { REPORT_REASONS, type BookingStatus } from "@/lib/types";
import { formatIban, operatorLabel, type PayoutMethod } from "@/lib/payout";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

const TABS = [
  ["verifications", "Vérifications"],
  ["signalements", "Signalements"],
  ["livraisons", "Livraisons"],
  ["versements", "Versements"],
  ["primes", "Primes ambassadeurs"],
  ["membres", "Membres"],
  ["reservations", "Réservations"],
] as const;
type Tab = (typeof TABS)[number][0];

type Row = Record<string, unknown>;
const one = (v: unknown): Row | undefined => (Array.isArray(v) ? (v[0] as Row) : ((v as Row | null) ?? undefined));

async function Admin({ searchParams }: { searchParams: Promise<{ onglet?: string; q?: string }> }) {
  const { userId, isAdmin } = await getSession();
  if (!userId || !isAdmin) notFound(); // la page n'existe pas pour les autres membres
  const sp = await searchParams;
  const tab: Tab = (TABS.find(([k]) => k === sp.onglet)?.[0] ?? "verifications") as Tab;
  const db = createAdminClient();

  const [{ count: pendingIds }, { count: pendingProofs }, { count: openReports }, { count: duePayouts }, { count: unverified }, { count: openDeliveries }, { count: dueRewards }] = await Promise.all([
    db.from("identity_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("trip_proofs").select("trip_id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("payout_status", "due"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("id_verified", false),
    db.from("bookings").select("id", { count: "exact", head: true }).gt("delivery_cents", 0).in("status", ["paid", "picked_up"]),
    db.from("ambassador_rewards").select("id", { count: "exact", head: true }).is("paid_at", null),
  ]);
  const counts: Record<Tab, number | null> = { verifications: (pendingIds ?? 0) + (pendingProofs ?? 0), signalements: openReports, livraisons: openDeliveries, versements: duePayouts, primes: dueRewards, membres: unverified, reservations: null };

  let content: React.ReactNode = null;

  if (tab === "verifications") {
    const BUCKET = "verification-documents";
    const sign = async (path: string | null) => (path ? (await db.storage.from(BUCKET).createSignedUrl(path, 300)).data?.signedUrl ?? null : null);
    const [{ data: ids }, { data: proofs }] = await Promise.all([
      db
        .from("identity_verifications")
        .select(
          "id, kind, document_type, front_path, back_path, selfie_path, created_at, user:profiles!identity_verifications_user_id_fkey(full_name, city, contact:member_contacts(last_name, phone, address_line, postal_code, address_city, country))",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(50),
      db
        .from("trip_proofs")
        .select(
          "trip_id, file_path, created_at, trip:trips(from_city, to_city, departure_at, carrier, transport_ref, transport_check), traveler:profiles!trip_proofs_traveler_id_fkey(full_name, contact:member_contacts(last_name))",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(50),
    ]);
    const DOC: Record<string, string> = { cni: "Carte d'identité", passport: "Passeport", residence_permit: "Titre de séjour", driving_license: "Permis de conduire", proof_of_address: "Justificatif de domicile" };
    const idRows = await Promise.all(
      ((ids ?? []) as Row[]).map(async (v) => ({
        v,
        files: (
          await Promise.all([
            [v.kind === "address" ? "Justificatif" : "Recto", v.front_path],
            ["Verso", v.back_path],
            ["Selfie", v.selfie_path],
          ].map(async ([label, path]) => [label, await sign(path as string | null)] as const))
        ).filter(([, url]) => url),
      })),
    );
    const proofRows = await Promise.all(((proofs ?? []) as Row[]).map(async (p) => ({ p, url: await sign(p.file_path as string | null) })));
    const Doc = ({ label, url }: { label: string; url: string }) => (
      <a href={url} target="_blank" rel="noreferrer noopener" className="block overflow-hidden rounded-xl ring-1 ring-line hover:ring-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="h-36 w-full bg-paper object-cover" />
        <span className="block px-2 py-1 text-xs font-semibold">{label}</span>
      </a>
    );
    content =
      idRows.length || proofRows.length ? (
        <div className="space-y-8">
          {idRows.length > 0 && (
            <section>
              <h2 className="mb-3 font-bold">Pièces d&apos;identité</h2>
              <ul className="space-y-3">
                {idRows.map(({ v, files }) => (
                  <li key={v.id as number} className="rounded-2xl bg-white p-5 ring-1 ring-line">
                    <p className="font-bold">
                      {(one(v.user)?.full_name as string) || "Membre"} · {DOC[v.document_type as string]}
                    </p>
                    <p className="text-sm text-muted">Déposé le {dayLabel(v.created_at as string)} · liens valables 5 minutes</p>
                    {(() => {
                      const c = one(one(v.user)?.contact as Row | Row[] | null);
                      if (!c) return null;
                      return (
                        <p className="mt-1 text-sm text-ink-soft">
                          Nom déclaré : <span className="font-semibold">{(c.last_name as string) || "—"}</span>
                          {v.kind === "address" && (
                            <>
                              {" "}· Adresse : {[c.address_line, c.postal_code, c.address_city, c.country].filter(Boolean).join(", ")} · Tél. {(c.phone as string) || "—"}
                            </>
                          )}
                        </p>
                      );
                    })()}
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:max-w-lg">
                      {files.map(([label, url]) => (
                        <Doc key={String(label)} label={String(label)} url={url as string} />
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-ink-soft">
                      {v.kind === "address"
                        ? "Vérifiez : document de moins de 3 mois (facture, avis d'imposition, attestation), même nom et même adresse que déclarés."
                        : "Vérifiez : nom identique au nom déclaré, pièce non expirée, visage du selfie identique à la photo."}
                    </p>
                    <div className="mt-3">
                      <ReviewForm kind="identity" id={String(v.id)} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {proofRows.length > 0 && (
            <section>
              <h2 className="mb-3 font-bold">Justificatifs de voyage</h2>
              <ul className="space-y-3">
                {proofRows.map(({ p, url }) => {
                  const trip = one(p.trip);
                  return (
                    <li key={p.trip_id as string} className="rounded-2xl bg-white p-5 ring-1 ring-line">
                      <p className="font-bold">
                        {(one(p.traveler)?.full_name as string) || "Voyageur"} · {codeFor((trip?.from_city as string) ?? "")} ›{" "}
                        {codeFor((trip?.to_city as string) ?? "")}
                      </p>
                      <p className="text-sm text-muted">
                        Départ annoncé : {trip ? dayLabel(trip.departure_at as string) : "—"}
                        {trip?.transport_ref ? ` · vol ${trip.transport_ref as string} (${(trip.transport_check as string) ?? "—"})` : ""}
                        {" "}· nom déclaré : {(one(one(p.traveler)?.contact as Row | Row[] | null)?.last_name as string) || "—"}
                      </p>
                      {url && (
                        <a href={url} target="_blank" rel="noreferrer noopener" className="mt-2 inline-block text-sm font-semibold text-brand">
                          Ouvrir le billet (lien valable 5 minutes)
                        </a>
                      )}
                      <p className="mt-2 text-sm text-ink-soft">Vérifiez : même nom que le voyageur, même trajet et même date.</p>
                      <div className="mt-3">
                        <ReviewForm kind="trip" id={p.trip_id as string} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <Empty text="Aucune pièce à vérifier." />
      );
  }

  if (tab === "signalements") {
    const { data } = await db
      .from("reports")
      .select("id, reason, details, created_at, booking_id, author:profiles!reports_author_id_fkey(full_name)")
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .limit(100);
    content = (data ?? []).length ? (
      <ul className="space-y-3">
        {(data as Row[]).map((r) => (
          <li key={r.id as number} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-bold">{REPORT_REASONS.find((x) => x.id === r.reason)?.label}</p>
              <p className="text-sm text-muted">
                par {one(r.author)?.full_name as string} · {dayLabel(r.created_at as string)}
              </p>
            </div>
            <p className="mt-2 whitespace-pre-line text-ink-soft">{r.details as string}</p>
            <Link href={`/reservations/${r.booking_id}`} className="mt-2 inline-block text-sm font-semibold text-brand">
              Voir la réservation
            </Link>
            <div className="mt-4">
              <ResolveReportForm reportId={r.id as number} />
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <Empty text="Aucun signalement ouvert." />
    );
  }

  if (tab === "livraisons") {
    const { data: rows } = await db
      .from("bookings")
      .select("id, status, tracking_code, delivery_status, delivery_partner_ref, weight_kg, recipient_name, recipient_phone, trip:trips(to_city, departure_at), delivery:booking_deliveries(address)")
      .gt("delivery_cents", 0)
      .in("status", ["paid", "picked_up"])
      .order("created_at", { ascending: true })
      .limit(100);
    const { data: steps } = await db
      .from("booking_events")
      .select("booking_id, kind")
      .in("booking_id", (rows ?? []).map((r) => r.id as string))
      .in("kind", ["arrived", "out_for_delivery"]);
    const done = new Set((steps ?? []).map((e) => `${e.booking_id}:${e.kind}`));
    content = rows?.length ? (
      <ul className="space-y-3">
        {(rows as Row[]).map((b) => {
          const trip = one(b.trip);
          const id = b.id as string;
          return (
            <li key={id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">
                  <span className="wide tabular">{b.tracking_code as string}</span> · {trip?.to_city as string} · {b.weight_kg as number} kg
                </p>
                <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold">
                  {DELIVERY_STATUS_LABEL[(b.delivery_status as DeliveryStatus) ?? "requested"]}
                  {done.has(`${id}:arrived`) ? " · voyageur arrivé" : ""}
                  {done.has(`${id}:out_for_delivery`) ? " · colis remis au livreur" : ""}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {b.recipient_name as string} · {b.recipient_phone as string} · {(one(b.delivery)?.address as string) ?? "adresse manquante"}
              </p>
              <p className="text-sm text-muted">
                Départ {trip ? dayLabel(trip.departure_at as string) : "—"}
                {b.delivery_partner_ref ? ` · réf. partenaire ${b.delivery_partner_ref as string}` : " · pas encore transmis au partenaire"}
              </p>
              {b.status === "picked_up" && (
                <div className="mt-3 flex gap-2">
                  <form action={completeHomeDelivery.bind(null, id, "delivered")}>
                    <button type="submit" className={buttonClass("primary", "sm")}>Livré au destinataire</button>
                  </form>
                  <form action={completeHomeDelivery.bind(null, id, "failed")}>
                    <button type="submit" className={buttonClass("ghost", "sm")}>Échec de livraison</button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    ) : (
      <Empty text="Aucune livraison à domicile en cours." />
    );
  }

  if (tab === "versements") {
    const boostShown = new Set<string>();
    const { data } = await db
      .from("bookings")
      .select("id, base_cents, delivery_cents, delivered_at, trip:trips(id, traveler_id, from_city, to_city, boost_fee_cents, boost_settled_booking, traveler:profiles!trips_traveler_id_fkey(full_name))")
      .eq("payout_status", "due")
      .order("delivered_at", { ascending: true })
      .limit(100);
    // Où verser : moyen enregistré par chaque voyageur (donnée privée, lue avec la clé de service).
    const travelerIds = [...new Set((data ?? []).map((b) => one((b as Row).trip as Row | Row[] | null)?.traveler_id as string).filter(Boolean))];
    const { data: methods } = travelerIds.length ? await db.from("payout_methods").select("*").in("user_id", travelerIds) : { data: [] };
    const methodFor = new Map(((methods ?? []) as (PayoutMethod & { user_id: string })[]).map((m) => [m.user_id, m]));
    content = (data ?? []).length ? (
      <ul className="space-y-3">
        {(data as Row[]).map((b) => {
          const trip = one(b.trip);
          // Mise en avant payante : retenue une seule fois, sur le premier versement du trajet.
          const boost = trip && (trip.boost_fee_cents as number) > 0 && !trip.boost_settled_booking && !boostShown.has(trip.id as string) ? (trip.boost_fee_cents as number) : 0;
          if (boost) boostShown.add(trip!.id as string);
          return (
            <li key={b.id as string} className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-line">
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {one(trip?.traveler)?.full_name as string} · <span className="tabular">{euros((b.base_cents as number) + ((b.delivery_cents as number) ?? 0) - boost)}</span>
                  {boost > 0 && <span className="ml-2 text-sm font-normal text-muted">(mise en avant −{euros(boost)} retenue)</span>}
                </p>
                <p className="text-sm text-muted">
                  {codeFor((trip?.from_city as string) ?? "")} › {codeFor((trip?.to_city as string) ?? "")} · livré le{" "}
                  {b.delivered_at ? dayLabel(b.delivered_at as string) : "—"}
                </p>
                {(() => {
                  const m = methodFor.get(trip?.traveler_id as string);
                  if (!m) return <p className="mt-1 text-sm font-semibold text-danger">Aucun moyen de versement enregistré : prévenir le voyageur.</p>;
                  return (
                    <p className="tabular mt-1 text-sm">
                      {m.kind === "iban" ? `Virement · ${formatIban(m.iban ?? "")}${m.bic ? ` · ${m.bic}` : ""}` : `${operatorLabel(m.mobile_operator)} · ${m.mobile_number}${m.country ? ` (${m.country})` : ""}`} · {m.holder_name}
                    </p>
                  );
                })()}
              </div>
              <PayoutForm bookingId={b.id as string} />
            </li>
          );
        })}
      </ul>
    ) : (
      <Empty text="Aucun versement en attente." />
    );
  }

  if (tab === "primes") {
    const { data } = await db
      .from("ambassador_rewards")
      .select("id, traveler_id, kind, amount_cents, milestone, created_at, traveler:profiles!ambassador_rewards_traveler_id_fkey(full_name)")
      .is("paid_at", null)
      .order("created_at", { ascending: true })
      .limit(500);
    const byTraveler = new Map<string, { name: string; total: number; items: Row[] }>();
    for (const r of (data ?? []) as Row[]) {
      const key = r.traveler_id as string;
      const entry = byTraveler.get(key) ?? { name: (one(r.traveler)?.full_name as string) || "Membre", total: 0, items: [] };
      entry.total += r.amount_cents as number;
      entry.items.push(r);
      byTraveler.set(key, entry);
    }
    content = byTraveler.size ? (
      <ul className="space-y-3">
        {[...byTraveler].map(([travelerId, t]) => (
          <li key={travelerId} className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-line">
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {t.name} · <span className="tabular">{euros(t.total)}</span>
              </p>
              <p className="text-sm text-muted">
                {t.items.map((r) => (r.kind === "milestone" ? `${r.milestone} livraisons` : "filleul")).join(" · ")}
              </p>
            </div>
            <RewardsPayoutForm travelerId={travelerId} />
          </li>
        ))}
      </ul>
    ) : (
      <Empty text="Aucune prime à verser." />
    );
  }

  if (tab === "membres") {
    const q = (sp.q ?? "").trim().slice(0, 80);
    let query = db.from("profiles").select("id, full_name, city, id_verified, created_at").order("created_at", { ascending: false }).limit(50);
    if (q) query = query.ilike("full_name", `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    const { data } = await query;
    content = (
      <>
        <form className="mb-4 flex gap-2" action="/admin">
          <input type="hidden" name="onglet" value="membres" />
          <label htmlFor="q" className="sr-only">
            Rechercher un membre
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Rechercher par nom" className="w-full max-w-sm rounded-full border border-line bg-white px-4 py-2" />
          <button type="submit" className={buttonClass("outline", "md")}>
            Rechercher
          </button>
        </form>
        <ul className="divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
          {(data as Row[] | null)?.map((p) => (
            <li key={p.id as string} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={(p.full_name as string) || "?"} verified={p.id_verified as boolean} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{(p.full_name as string) || "Sans nom"}</p>
                <p className="text-sm text-muted">{(p.city as string) || "Ville non renseignée"}</p>
              </div>
              <form action={setVerified.bind(null, p.id as string, !(p.id_verified as boolean))}>
                <button type="submit" className={buttonClass(p.id_verified ? "ghost" : "primary", "sm")}>
                  {p.id_verified ? "Retirer la vérification" : "Marquer vérifié"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (tab === "reservations") {
    const { data } = await db
      .from("bookings")
      .select("id, status, total_cents, weight_kg, created_at, trip:trips(from_city, to_city)")
      .order("created_at", { ascending: false })
      .limit(50);
    content = (
      <ul className="divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
        {(data as Row[] | null)?.map((b) => {
          const trip = one(b.trip);
          return (
            <li key={b.id as string} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Link href={`/reservations/${b.id}`} className="wide tabular w-28 font-extrabold">
                {codeFor((trip?.from_city as string) ?? "")} › {codeFor((trip?.to_city as string) ?? "")}
              </Link>
              <p className="flex-1 text-sm text-muted">
                {kg(b.weight_kg as number)} · {euros(b.total_cents as number)} · {dayLabel(b.created_at as string)}
              </p>
              <StatusBadge status={b.status as BookingStatus} />
              {["paid", "picked_up"].includes(b.status as string) && <RefundForm bookingId={b.id as string} />}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="display text-3xl sm:text-4xl">Administration</h1>
      <nav className="mt-6 flex flex-wrap gap-1" aria-label="Sections">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin?onglet=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-line hover:bg-paper"}`}
          >
            {label}
            {counts[key] ? <span className="tabular ml-1.5 rounded-full bg-signal px-1.5 text-xs text-ink">{counts[key]}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{content}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl bg-white px-6 py-10 text-center text-muted ring-1 ring-line">{text}</p>;
}

export default function AdminPage(props: PageProps<"/[lang]/admin">) {
  return (
    <PageShell footer={false}>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-5xl" />}>
        <Admin searchParams={props.searchParams as Promise<{ onglet?: string; q?: string }>} />
      </Suspense>
    </PageShell>
  );
}
