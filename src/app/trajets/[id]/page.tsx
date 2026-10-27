import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarDays, CheckCircle2, MapPin, Plane, Star } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { BookingForm } from "@/components/booking-form";
import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { getTrip, getTripProof } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { TripProofForm } from "@/components/verification-forms";
import { isUpcoming, kg, longDate, memberSince, timeLabel } from "@/lib/format";
import { codeFor, tzFor } from "@/lib/places";
import { euros } from "@/lib/pricing";
import { getUserId } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/trajets/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const trip = await getTrip(id);
  if (!trip) return { title: "Trajet introuvable" };
  return {
    title: `Colis ${trip.from_city} → ${trip.to_city}, ${longDate(trip.departure_at, tzFor(trip.from_city))}`,
    description: `${kg(trip.capacity_kg - trip.reserved_kg)} disponibles à ${euros(trip.price_per_kg_cents)} le kilo. Réservez en ligne, paiement bloqué jusqu'à la livraison.`,
  };
}

async function TripView({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [trip, userId] = await Promise.all([getTrip(id), getUserId()]);
  if (!trip) notFound();

  const left = Math.max(0, trip.capacity_kg - trip.reserved_kg);
  const traveler = trip.traveler;
  const isOwner = userId === trip.traveler_id;
  const proof = isOwner && isSupabaseConfigured ? await getTripProof(trip.id) : null;
  const bookable = trip.status === "published" && left >= 0.5 && isUpcoming(trip.departure_at);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      {sp.publie && (
        <p role="status" className="mb-6 flex items-center gap-2 rounded-2xl bg-ok-pale px-4 py-3 font-medium text-ok">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Trajet publié. Partagez-le pour recevoir vos premières demandes.
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-6">
          {/* Carte d'embarquement */}
          <section className="tag-notch overflow-hidden rounded-3xl bg-ink text-white">
            <div className="px-6 pt-6 pb-7 sm:px-8">
              <p className="flex items-center gap-2 text-sm text-white/60 capitalize">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {longDate(trip.departure_at, tzFor(trip.from_city))} · départ {timeLabel(trip.departure_at, tzFor(trip.from_city))}
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div>
                  <p className="display text-5xl text-signal sm:text-6xl">{codeFor(trip.from_city)}</p>
                  <p className="mt-1 text-white/80">{trip.from_city}</p>
                </div>
                <div className="relative flex flex-1 items-center" aria-hidden="true">
                  <span className="h-px w-full border-t border-dashed border-white/30" />
                  <Plane className="absolute left-1/2 h-6 w-6 -translate-x-1/2 rotate-45 bg-ink text-white" />
                </div>
                <div className="text-right">
                  <p className="display text-5xl text-signal sm:text-6xl">{codeFor(trip.to_city)}</p>
                  <p className="mt-1 text-white/80">{trip.to_city}</p>
                </div>
              </div>
              {trip.ticket_verified && (
                <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-ok/20 px-3 py-1 text-sm font-semibold text-[#7ee2a1]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Trajet vérifié : billet contrôlé par Send By Me
                </p>
              )}
              <h1 className="sr-only">
                Trajet {trip.from_city} vers {trip.to_city}
              </h1>
            </div>
            <div className="grid grid-cols-3 border-t border-dashed border-white/20 text-center">
              <div className="px-3 py-4">
                <p className="text-xs text-white/50">Kilos libres</p>
                <p className="wide tabular mt-1 text-xl font-extrabold">{kg(left)}</p>
              </div>
              <div className="border-x border-dashed border-white/20 px-3 py-4">
                <p className="text-xs text-white/50">Prix au kilo</p>
                <p className="wide tabular mt-1 text-xl font-extrabold">{euros(trip.price_per_kg_cents)}</p>
              </div>
              <div className="px-3 py-4">
                <p className="text-xs text-white/50">Transport</p>
                <p className="wide mt-1 text-xl font-extrabold">
                  {{ plane: "Avion", car: "Voiture", bus: "Car", train: "Train" }[trip.mode]}
                </p>
              </div>
            </div>
          </section>

          {/* Voyageur */}
          {traveler && (
            <section className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
              <div className="flex items-center gap-4">
                <Avatar name={traveler.full_name || "Voyageur"} verified={traveler.id_verified} size={56} />
                <div>
                  <h2 className="text-lg font-bold">{traveler.full_name || "Voyageur"}</h2>
                  <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
                    {traveler.rating_count ? (
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-signal text-signal" aria-hidden="true" />
                        {traveler.rating_avg?.toLocaleString("fr-FR")} sur 5, {traveler.rating_count} avis
                      </span>
                    ) : (
                      <span>Pas encore d&apos;avis</span>
                    )}
                    <span>Membre depuis {memberSince(traveler.created_at)}</span>
                  </p>
                </div>
              </div>
              {traveler.id_verified && (
                <p className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-deep">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Identité vérifiée par Send By Me
                </p>
              )}
              {traveler.bio && <p className="mt-4 leading-relaxed text-ink-soft">{traveler.bio}</p>}
            </section>
          )}

          {/* Détails */}
          <section className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
            <h2 className="text-lg font-bold">Remise et récupération</h2>
            <dl className="mt-4 space-y-4 text-[15px]">
              {trip.pickup_note && (
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                  <div>
                    <dt className="font-semibold">Où remettre le colis à {trip.from_city}</dt>
                    <dd className="text-muted">{trip.pickup_note}</dd>
                  </div>
                </div>
              )}
              {trip.dropoff_note && (
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-signal-deep" aria-hidden="true" />
                  <div>
                    <dt className="font-semibold">Où le récupérer à {trip.to_city}</dt>
                    <dd className="text-muted">{trip.dropoff_note}</dd>
                  </div>
                </div>
              )}
            </dl>
            <h3 className="mt-6 font-semibold">Colis acceptés</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => trip.accepted_categories.includes(c.id)).map((c) => (
                <li key={c.id} className="rounded-full bg-paper px-3 py-1.5 text-sm">
                  {c.label}
                </li>
              ))}
            </ul>
            {trip.notes && (
              <>
                <h3 className="mt-6 font-semibold">Le mot du voyageur</h3>
                <p className="mt-2 leading-relaxed whitespace-pre-line text-ink-soft">{trip.notes}</p>
              </>
            )}
          </section>
        </div>

        {/* Réservation */}
        <aside className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8 lg:sticky lg:top-6">
          <h2 className="wide text-xl font-extrabold">Réserver des kilos</h2>
          <div className="mt-5">
            {isOwner ? (
              <div className="space-y-4">
                <p className="text-muted">C&apos;est votre trajet. Les demandes arrivent dans votre espace.</p>
                <ButtonLink href="/espace" variant="outline">
                  Voir mes demandes
                </ButtonLink>
                <div className="border-t border-line pt-5">
                  <h3 className="font-bold">Justificatif de voyage</h3>
                  {trip.ticket_verified ? (
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ok">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Trajet vérifié : le badge est visible par les expéditeurs.
                    </p>
                  ) : proof?.status === "pending" ? (
                    <p className="mt-2 text-sm text-muted">Justificatif reçu, en cours de vérification.</p>
                  ) : (
                    <>
                      <p className="mt-1 mb-3 text-sm text-muted">
                        Envoyez votre billet pour obtenir le badge « Trajet vérifié ». Il est supprimé après contrôle.
                      </p>
                      {proof?.status === "rejected" && (
                        <p role="alert" className="mb-3 rounded-xl bg-danger-pale px-3 py-2 text-sm text-danger">
                          Justificatif refusé : {proof.rejection_reason}
                        </p>
                      )}
                      <TripProofForm userId={userId!} tripId={trip.id} />
                    </>
                  )}
                </div>
              </div>
            ) : !bookable ? (
              <p className="text-muted">Ce trajet n&apos;accepte plus de réservations.</p>
            ) : !userId ? (
              <div className="space-y-4">
                <p className="text-muted">Connectez-vous pour envoyer une demande au voyageur. C&apos;est gratuit et sans engagement.</p>
                <ButtonLink href={`/connexion?suite=/trajets/${trip.id}`} className="w-full">
                  Se connecter pour réserver
                </ButtonLink>
                <p className="text-center text-sm text-muted">
                  Pas de compte ?{" "}
                  <Link href={`/inscription?suite=/trajets/${trip.id}`} className="font-semibold text-brand">
                    Inscrivez-vous
                  </Link>
                </p>
              </div>
            ) : (
              <BookingForm
                tripId={trip.id}
                pricePerKgCents={trip.price_per_kg_cents}
                maxKg={Math.min(50, left)}
                acceptedCategories={trip.accepted_categories}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function TripPage(props: PageProps<"/trajets/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[70vh] max-w-6xl" />}>
        <TripView params={props.params} searchParams={props.searchParams as Promise<Record<string, string>>} />
      </Suspense>
    </PageShell>
  );
}
