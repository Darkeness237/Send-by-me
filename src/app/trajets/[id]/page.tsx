import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarDays, CheckCircle2, MessageCircle, MapPin, Plane, ShieldCheck, Star, TicketCheck } from "lucide-react";
import { AmbassadorBadge } from "@/components/ambassador-badge";
import { Avatar } from "@/components/avatar";
import { BookingForm } from "@/components/booking-form";
import { TakeoffBanner } from "@/components/journey";
import { PageShell } from "@/components/page-shell";
import { startInquiry } from "@/app/actions/messages";
import { Button, ButtonLink } from "@/components/ui/button";
import { proposeTrip } from "@/app/actions/requests";
import { boostTrip } from "@/app/actions/trips";
import { BOOST_FEE_CENTS } from "@/lib/ambassador";
import { RequestCard } from "@/components/request-card";
import { getCreditBalance, getTrip, getTripProof, matchingRequests } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { TripProofForm } from "@/components/verification-forms";
import { isUpcoming, kg, longDate, memberSince, timeLabel } from "@/lib/format";
import { homeDeliveryFor } from "@/lib/delivery";
import { airlineName, TRANSPORT_CHECK_LABEL } from "@/lib/flights";
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
    description: `${kg(trip.capacity_kg - trip.reserved_kg)} disponibles à ${euros(trip.price_per_kg_cents)} le kilo. Réservez en ligne.`,
  };
}

async function TripView({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [trip, userId] = await Promise.all([getTrip(id), getUserId()]);
  if (!trip) notFound();

  const left = Math.max(0, trip.capacity_kg - trip.reserved_kg);
  const traveler = trip.traveler;
  const isOwner = userId === trip.traveler_id;
  const [proof, credit, requests] = await Promise.all([
    isOwner && isSupabaseConfigured ? getTripProof(trip.id) : null,
    userId && !isOwner && isSupabaseConfigured ? getCreditBalance(userId) : 0,
    isOwner && isSupabaseConfigured && trip.status === "published" ? matchingRequests(trip) : Promise.resolve([]),
  ]);
  const bookable = trip.status === "published" && left >= 0.5 && isUpcoming(trip.departure_at);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      {sp.publie && <TakeoffBanner title="C'est en ligne !" text="Votre trajet est publié. Partagez-le pour recevoir vos premières demandes." />}
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
                <Avatar name={traveler.full_name || "Voyageur"} verified={traveler.id_verified} certified={traveler.certified} src={traveler.avatar_url} size={56} />
                <div>
                  <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                    {traveler.full_name || "Voyageur"}
                    {traveler.ambassador_since && <AmbassadorBadge />}
                  </h2>
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
              {traveler.certified ? (
                <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink">
                  <ShieldCheck className="h-5 w-5 rounded-full bg-signal p-0.5" aria-hidden="true" /> Compte certifié : identité et adresse vérifiées
                </p>
              ) : traveler.id_verified ? (
                <p className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-deep">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Identité vérifiée par Send By Me
                </p>
              ) : null}
              {traveler.bio && <p className="mt-4 leading-relaxed text-ink-soft">{traveler.bio}</p>}
              {!isOwner && trip.status !== "cancelled" && (
                <form action={startInquiry.bind(null, trip.id)} className="mt-5">
                  <Button type="submit" variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> Poser une question à {traveler.full_name || "ce voyageur"}
                  </Button>
                </form>
              )}
            </section>
          )}

          {/* Transport */}
          {trip.carrier && (
            <section className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">{trip.mode === "plane" ? "Le vol" : "Le transport"}</h2>
                {trip.mode === "plane" && trip.transport_check && trip.transport_check !== "unchecked" && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                      trip.transport_check === "mismatch" ? "bg-danger-pale text-danger" : "bg-ok-pale text-ok"
                    }`}
                  >
                    <TicketCheck className="h-4 w-4" aria-hidden="true" />
                    {TRANSPORT_CHECK_LABEL[trip.transport_check]}
                  </span>
                )}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-[15px] sm:grid-cols-4">
                <div>
                  <dt className="text-sm text-muted">Compagnie</dt>
                  <dd className="font-semibold">{trip.mode === "plane" ? airlineName(trip.carrier) : trip.carrier}</dd>
                </div>
                {trip.transport_ref && (
                  <div>
                    <dt className="text-sm text-muted">{trip.mode === "plane" ? "Vol" : "Numéro"}</dt>
                    <dd className="wide tabular font-semibold">{trip.transport_ref}</dd>
                  </div>
                )}
                {trip.from_airport && trip.to_airport && (
                  <div>
                    <dt className="text-sm text-muted">Aéroports</dt>
                    <dd className="wide tabular font-semibold">
                      {trip.from_airport} → {trip.to_airport}
                    </dd>
                  </div>
                )}
                {trip.mode === "plane" && (
                  <div>
                    <dt className="text-sm text-muted">Escale</dt>
                    <dd className="font-semibold">{trip.has_stopover ? "Oui" : "Vol direct"}</dd>
                  </div>
                )}
              </dl>
              {trip.transport_check_notes && trip.transport_check_notes.length > 0 && (
                <ul className="mt-4 space-y-1 text-sm text-muted">
                  {trip.transport_check_notes.map((n) => (
                    <li key={n.label} className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${n.ok ? "text-ok" : "text-danger"}`} aria-hidden="true" />
                      {n.label}
                    </li>
                  ))}
                </ul>
              )}
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
            {(() => {
              // Liste longue : on dit plutôt ce que le voyageur refuse.
              const accepted = CATEGORIES.filter((c) => trip.accepted_categories.includes(c.id));
              const refused = CATEGORIES.filter((c) => !trip.accepted_categories.includes(c.id));
              const shown = accepted.length > 8 && refused.length <= 4 ? refused : accepted;
              return (
                <>
                  {shown === refused && (
                    <p className="mt-2 text-sm text-muted">{refused.length ? "Tous les types de colis, sauf :" : "Tous les types de colis."}</p>
                  )}
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {shown.map((c) => (
                      <li key={c.id} className={`rounded-full px-3 py-1.5 text-sm ${shown === refused ? "bg-danger-pale text-danger" : "bg-paper"}`}>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </>
              );
            })()}
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
                {requests.length > 0 && (
                  <div className="border-t border-line pt-5">
                    <h3 className="font-bold">
                      {requests.length} expéditeur{requests.length > 1 ? "s cherchent" : " cherche"} un voyageur sur votre ligne
                    </h3>
                    <ul className="mt-3 space-y-3">
                      {requests.map((r) => (
                        <li key={r.id} className="space-y-2">
                          <RequestCard r={r} />
                          <form action={proposeTrip.bind(null, r.id, trip.id)}>
                            <Button type="submit" size="sm" className="w-full">
                              Proposer mon trajet
                            </Button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {trip.status === "published" && (
                  <div className="border-t border-line pt-5">
                    <h3 className="font-bold">Mise en avant</h3>
                    {trip.featured ? (
                      <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-brand-deep">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {trip.boosted_at
                          ? `Votre trajet apparaît en tête des résultats de sa ligne. ${euros(BOOST_FEE_CENTS)} sera retenu sur votre premier versement de ce trajet.`
                          : "Votre trajet apparaît en tête des résultats de sa ligne, gratuitement."}
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 mb-3 text-sm text-muted">
                          Placez votre trajet en tête des résultats de sa ligne jusqu&apos;au départ. {euros(BOOST_FEE_CENTS)}, retenu sur votre premier
                          versement de ce trajet : rien à payer si vous ne recevez aucune réservation.
                        </p>
                        <form action={boostTrip.bind(null, trip.id)}>
                          <Button type="submit" size="sm" variant="outline">
                            Mettre en avant pour {euros(BOOST_FEE_CENTS)}
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                )}
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
                maxKg={left}
                acceptedCategories={trip.accepted_categories}
                homeDeliveryCents={homeDeliveryFor(trip.to_country)}
                creditCents={credit}
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
