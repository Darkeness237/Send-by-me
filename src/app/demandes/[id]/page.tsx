import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarDays, House, Ruler, Scale, Tag } from "lucide-react";
import { closeRequest, proposeTrip } from "@/app/actions/requests";
import { Avatar } from "@/components/avatar";
import { TakeoffBanner } from "@/components/journey";
import { PageShell } from "@/components/page-shell";
import { photoUrl, shortDate } from "@/components/request-card";
import { TripTag } from "@/components/trip-tag";
import { Button, ButtonLink } from "@/components/ui/button";
import { getMyTrips, getRequest, matchingTrips } from "@/lib/data";
import { kg, longDate } from "@/lib/format";
import { codeFor, tzFor } from "@/lib/places";
import { euros } from "@/lib/pricing";
import { getUserId } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";

export const metadata: Metadata = { title: "Demande d'envoi" };

async function RequestView({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, sp, userId] = await Promise.all([params, searchParams, getUserId()]);
  const r = await getRequest(id);
  if (!r) notFound();
  const isOwner = userId === r.sender_id;
  const [matches, myTrips] = await Promise.all([
    matchingTrips(r),
    userId && !isOwner ? getMyTrips(userId) : Promise.resolve([]),
  ]);
  // Trajets du voyageur connecté qui conviennent à cette demande.
  const mine = myTrips.filter(
    (t) =>
      t.status === "published" &&
      t.from_city.toLowerCase() === r.from_city.toLowerCase() &&
      t.to_city.toLowerCase() === r.to_city.toLowerCase() &&
      t.departure_at.slice(0, 10) >= r.earliest_date &&
      t.departure_at.slice(0, 10) <= r.latest_date &&
      t.capacity_kg - t.reserved_kg >= Number(r.weight_kg),
  );
  const dims = [r.length_cm, r.width_cm, r.height_cm].every(Boolean) ? `${r.length_cm} × ${r.width_cm} × ${r.height_cm} cm` : null;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
      <div className="space-y-6">
        {sp.publiee && <TakeoffBanner title="Demande publiée !" text="Les voyageurs qui partent sur votre ligne sont prévenus." />}
        <section className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
          <div className="bg-ink p-6 text-white">
            <p className="display text-4xl text-signal">
              {codeFor(r.from_city)} → {codeFor(r.to_city)}
            </p>
            <h1 className="mt-1 text-lg font-bold">
              Colis de {r.from_city} à {r.to_city}
            </h1>
            {r.status !== "open" && <p className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-sm">Demande clôturée</p>}
          </div>
          {r.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-1 bg-paper p-1 sm:grid-cols-4">
              {r.photos.map((p) => (
                <a key={p} href={photoUrl(p)} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(p)} alt="Photo du colis" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          )}
          <dl className="grid gap-4 p-6 text-[15px] sm:grid-cols-2">
            <div className="flex gap-3">
              <Scale className="mt-0.5 h-5 w-5 text-brand" aria-hidden="true" />
              <div>
                <dt className="text-sm text-muted">Poids</dt>
                <dd className="font-semibold">{kg(Number(r.weight_kg))}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Tag className="mt-0.5 h-5 w-5 text-brand" aria-hidden="true" />
              <div>
                <dt className="text-sm text-muted">Type</dt>
                <dd className="font-semibold">{CATEGORIES.find((c) => c.id === r.category)?.label}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 text-brand" aria-hidden="true" />
              <div>
                <dt className="text-sm text-muted">Dates</dt>
                <dd className="font-semibold">
                  du {shortDate(r.earliest_date)} au {shortDate(r.latest_date)}
                </dd>
              </div>
            </div>
            {dims && (
              <div className="flex gap-3">
                <Ruler className="mt-0.5 h-5 w-5 text-brand" aria-hidden="true" />
                <div>
                  <dt className="text-sm text-muted">Dimensions</dt>
                  <dd className="font-semibold">{dims}</dd>
                </div>
              </div>
            )}
            {r.wants_home_delivery && (
              <div className="flex gap-3">
                <House className="mt-0.5 h-5 w-5 text-brand" aria-hidden="true" />
                <div>
                  <dt className="text-sm text-muted">Livraison</dt>
                  <dd className="font-semibold">À domicile souhaitée</dd>
                </div>
              </div>
            )}
            {r.max_price_per_kg_cents && (
              <div>
                <dt className="text-sm text-muted">Budget maximum</dt>
                <dd className="font-semibold">{euros(r.max_price_per_kg_cents)} par kg</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted">Contenu</dt>
              <dd className="leading-relaxed whitespace-pre-line text-ink-soft">{r.description}</dd>
            </div>
          </dl>
          {r.sender && (
            <div className="flex items-center gap-3 border-t border-line px-6 py-4">
              <Avatar name={r.sender.full_name || "Membre"} verified={r.sender.id_verified} certified={r.sender.certified} src={r.sender.avatar_url} size={40} />
              <p className="text-sm">
                <span className="font-semibold">{r.sender.full_name}</span>
                <span className="block text-muted">{r.sender.certified ? "Compte certifié" : r.sender.id_verified ? "Identité vérifiée" : "Membre"}</span>
              </p>
              {isOwner && r.status === "open" && (
                <form action={closeRequest.bind(null, r.id)} className="ml-auto">
                  <Button type="submit" variant="ghost" size="sm">
                    Clôturer ma demande
                  </Button>
                </form>
              )}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        {!isOwner && r.status === "open" && (
          <section className="rounded-3xl bg-white p-6 ring-1 ring-line">
            <h2 className="text-lg font-bold">Vous faites ce trajet ?</h2>
            {!userId ? (
              <>
                <p className="mt-1 mb-4 text-sm text-muted">Connectez-vous pour proposer votre trajet à cet expéditeur.</p>
                <ButtonLink href={`/connexion?suite=/demandes/${r.id}`}>Se connecter</ButtonLink>
              </>
            ) : mine.length ? (
              <ul className="mt-3 space-y-2">
                {mine.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-paper p-3">
                    <span className="text-sm">
                      <span className="font-semibold capitalize">{longDate(t.departure_at, t.from_tz ?? tzFor(t.from_city))}</span>
                      <span className="block text-muted">
                        {kg(t.capacity_kg - t.reserved_kg)} libres · {euros(t.price_per_kg_cents)}/kg
                      </span>
                    </span>
                    <form action={proposeTrip.bind(null, r.id, t.id)}>
                      <Button type="submit" size="sm">
                        Proposer
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p className="mt-1 mb-4 text-sm text-muted">Publiez votre trajet sur cette ligne, dans ces dates, pour le proposer à l&apos;expéditeur.</p>
                <ButtonLink href="/publier" variant="signal">
                  Proposer mes kilos
                </ButtonLink>
              </>
            )}
          </section>
        )}
        <section>
          <h2 className="mb-3 font-bold">
            {matches.length ? `${matches.length} trajet${matches.length > 1 ? "s" : ""} correspond${matches.length > 1 ? "ent" : ""}` : "Aucun trajet ne correspond encore"}
          </h2>
          {matches.length ? (
            <ul className="space-y-3">
              {matches.map((t) => (
                <li key={t.id}>
                  <TripTag trip={t} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-3xl bg-white p-5 text-sm text-muted ring-1 ring-line">
              {isOwner ? "Nous vous prévenons dès qu'un voyageur publie un trajet qui convient." : "Les trajets compatibles s'afficheront ici."}{" "}
              <Link href={`/recherche?from=${encodeURIComponent(r.from_city)}&to=${encodeURIComponent(r.to_city)}`} className="font-semibold text-brand">
                Voir tous les trajets de la ligne
              </Link>
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}

export default function RequestPage(props: PageProps<"/demandes/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[70vh] max-w-6xl" />}>
        <RequestView params={props.params} searchParams={props.searchParams as Promise<Record<string, string | undefined>>} />
      </Suspense>
    </PageShell>
  );
}
