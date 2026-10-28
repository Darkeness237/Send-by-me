import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { KeyRound, Lock } from "lucide-react";
import { acceptBooking, cancelBooking, confirmPickup, declineBooking } from "@/app/actions/bookings";
import { startCheckout } from "@/app/actions/payments";
import { Avatar } from "@/components/avatar";
import { ReportForm } from "@/components/account-forms";
import { DeliveryCodeForm, MessageForm, ReviewForm } from "@/components/booking-client-forms";
import { CallPanel } from "@/components/call-panel";
import { OfferPanel } from "@/components/offer-panel";
import { ParcelPhotos } from "@/components/parcel-photos";
import { ChatMessages } from "@/components/chat-messages";
import { LiveRefresh } from "@/components/live-refresh";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { markTravelStep } from "@/app/actions/tracking";
import { TrackingTimeline } from "@/components/tracking-timeline";
import { getBooking, getBookingPhotos, getDeliveryAddress, getDeliveryCode, getMessages, getPriceOffers, getTrackingEvents, markThreadRead } from "@/lib/data";
import { missingPhotos, PHOTO_STEPS, REQUIRED_BEFORE_DELIVERY, REQUIRED_BEFORE_PICKUP } from "@/lib/parcel-photos";
import { advanceTransit } from "@/lib/transit";
import { kg, longDate, timeLabel } from "@/lib/format";
import { codeFor, tzFor } from "@/lib/places";
import { euros } from "@/lib/pricing";
import { createClient, getUserId } from "@/lib/supabase/server";
import { bookingStatusLabel, CATEGORIES } from "@/lib/types";

export const metadata: Metadata = { title: "Ma réservation", robots: { index: false } };

async function BookingView({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const userId = await getUserId();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!userId) redirect(`/connexion?suite=/reservations/${id}`);

  const booking = await getBooking(id); // RLS : null si l'utilisateur ne participe pas
  if (!booking || !booking.trip) notFound();
  const trip = booking.trip;
  const isSender = booking.sender_id === userId;
  const isTraveler = trip.traveler_id === userId;
  // Le suivi passe seul « en transit » puis « arrivé » d'après les horaires du vol.
  if (booking.status === "picked_up") await advanceTransit(booking.id);

  const [messages, , code, myReview, events, deliveryAddress, offers, photos] = await Promise.all([
    getMessages(booking.id),
    markThreadRead(userId, booking.id),
    isSender && ["paid", "picked_up"].includes(booking.status) ? getDeliveryCode(booking.id) : Promise.resolve(null),
    (async () => {
      if (booking.status !== "delivered") return null;
      const supabase = await createClient();
      const { data } = await supabase.from("reviews").select("id").eq("booking_id", booking.id).eq("author_id", userId).maybeSingle();
      return data;
    })(),
    getTrackingEvents(booking.id),
    isSender && booking.delivery_cents ? getDeliveryAddress(booking.id) : Promise.resolve(null),
    booking.status === "pending" ? getPriceOffers(booking.id) : Promise.resolve([]),
    booking.status === "pending" ? Promise.resolve([]) : getBookingPhotos(booking.id),
  ]);
  const tz = { from: tzFor(trip.from_city), to: tzFor(trip.to_city) };
  const flight = trip.mode === "plane" && trip.transport_ref ? `Vol ${trip.transport_ref}` : null;
  const timelineDetails: Record<string, string> = {
    departed: [flight, `départ ${longDate(trip.departure_at, tz.from)} à ${timeLabel(trip.departure_at, tz.from)}`].filter(Boolean).join(" · "),
    ...(trip.arrival_at ? { arrived: `Arrivée prévue ${longDate(trip.arrival_at, tz.to)} à ${timeLabel(trip.arrival_at, tz.to)} (heure locale)` } : {}),
    ...(booking.status === "picked_up" || booking.status === "paid" ? { delivered: `${booking.recipient_name} donne son code au voyageur en recevant le colis` } : {}),
  };
  const hasEvent = (k: string) => events.some((e) => e.kind === k);
  const homeDelivery = Boolean(booking.delivery_cents);

  const other = isSender ? trip.traveler : booking.sender;
  const closed = booking.status === "declined" || booking.status === "cancelled" || booking.status === "refunded";
  const senderName = booking.sender?.full_name?.split(" ")[0] || "l'expéditeur";
  const travelerName = trip.traveler?.full_name?.split(" ")[0] || "le voyageur";
  const stepLabels = (kinds: string[]) => kinds.map((k) => `« ${PHOTO_STEPS.find((s) => s.kind === k)?.label} »`).join(", ");
  const missingForPickup = missingPhotos(photos, REQUIRED_BEFORE_PICKUP);
  const missingForDelivery = missingPhotos(photos, REQUIRED_BEFORE_DELIVERY);
  const reportable = ["paid", "picked_up", "delivered", "refunded"].includes(booking.status);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      <LiveRefresh bookingId={booking.id} />
      <div className="space-y-6">
        {sp.paiement === "ok" && booking.status === "accepted" && (
          <p role="status" className="rounded-2xl bg-brand-pale px-4 py-3 text-brand-deep">
            Paiement en cours de confirmation. Cette page se met à jour dans quelques secondes.
          </p>
        )}
        {sp.paiement === "indisponible" && (
          <p role="alert" className="rounded-2xl bg-warn-pale px-4 py-3 text-warn">Le paiement en ligne n&apos;est pas encore activé sur ce site.</p>
        )}

        <section className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="wide text-2xl font-extrabold">
              {codeFor(trip.from_city)} › {codeFor(trip.to_city)}
            </h1>
            <StatusBadge status={booking.status} label={bookingStatusLabel(booking.status, events)} />
          </div>
          <p className="mt-1 text-muted capitalize">
            {longDate(trip.departure_at, tzFor(trip.from_city))}, {timeLabel(trip.departure_at, tzFor(trip.from_city))} · {trip.from_city} → {trip.to_city}
          </p>

          <div className="mt-6 rounded-2xl bg-paper p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Suivi de l&apos;envoi</h2>
              {booking.tracking_code && (
                <Link href={`/suivi/${booking.tracking_code}`} className="wide tabular rounded-full bg-white px-3 py-1 text-sm font-bold ring-1 ring-line hover:ring-brand">
                  {booking.tracking_code}
                </Link>
              )}
            </div>
            <TrackingTimeline events={events} homeDelivery={homeDelivery} details={timelineDetails} />
            {isSender && booking.tracking_code && !closed && (
              <p className="mt-4 text-sm text-muted">
                Envoyez ce lien à {booking.recipient_name} pour qu&apos;il suive le colis :{" "}
                <Link href={`/suivi/${booking.tracking_code}`} className="font-semibold text-brand">
                  send-by-me.com/suivi/{booking.tracking_code}
                </Link>
              </p>
            )}
          </div>

          <dl className="mt-6 grid gap-4 border-t border-line pt-6 text-[15px] sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">Colis</dt>
              <dd className="font-semibold">
                {kg(booking.weight_kg)} · {CATEGORIES.find((c) => c.id === booking.category)?.label}
              </dd>
              <dd className="text-ink-soft">{booking.description}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Destinataire</dt>
              <dd className="font-semibold">{booking.recipient_name}</dd>
              <dd className="tabular text-ink-soft">{booking.recipient_phone}</dd>
              {isSender && booking.recipient_email && <dd className="text-ink-soft">{booking.recipient_email}</dd>}
              {booking.delivery_cents ? (
                <dd className="mt-1 text-ink-soft">
                  <span className="font-semibold text-ink">Livraison à domicile Send By Me</span>
                  {isSender && deliveryAddress ? ` : ${deliveryAddress}` : " : notre livreur partenaire récupère le colis à l'arrivée."}
                </dd>
              ) : null}
            </div>
            <div>
              <dt className="text-sm text-muted">{isTraveler ? "Vous recevrez" : "Total"}</dt>
              <dd className="wide tabular text-xl font-extrabold">{euros(isTraveler ? booking.base_cents : booking.total_cents)}</dd>
              {!isTraveler && (
                <dd className="tabular text-sm text-muted">
                  Transport {euros(booking.base_cents)}
                  {booking.delivery_cents ? ` · livraison ${euros(booking.delivery_cents)}` : ""} · frais de service {euros(booking.fee_cents)}
                  {booking.discount_cents ? ` · crédit parrainage −${euros(booking.discount_cents)}` : ""}
                </dd>
              )}
            </div>
          </dl>
        </section>

        {/* Actions selon le rôle et l'étape */}
        <section className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
          {booking.status === "pending" && (isSender || isTraveler) && (
            <div className="mb-6">
              <OfferPanel
                bookingId={booking.id}
                myId={userId}
                offers={offers}
                currentCents={booking.price_per_kg_cents ?? trip.price_per_kg_cents}
                listedCents={trip.price_per_kg_cents}
                weightKg={Number(booking.weight_kg)}
                otherName={other?.full_name?.split(" ")[0] || (isSender ? "le voyageur" : "l'expéditeur")}
              />
            </div>
          )}
          {isSender && booking.status === "pending" && (
            <Action text="Le voyageur a reçu votre demande. Vous serez prévenu dès qu'il répond.">
              <form action={cancelBooking.bind(null, booking.id)}>
                <Button variant="danger" type="submit">Annuler la demande</Button>
              </form>
            </Action>
          )}
          {isSender && booking.status === "accepted" && (
            <Action text={`${other?.full_name ?? "Le voyageur"} a accepté. Payez pour confirmer votre envoi.`}>
              <div className="flex flex-wrap gap-2">
                <form action={startCheckout.bind(null, booking.id)}>
                  <Button type="submit" size="lg">
                    <Lock className="h-4 w-4" aria-hidden="true" /> Payer {euros(booking.total_cents)}
                  </Button>
                </form>
                <form action={cancelBooking.bind(null, booking.id)}>
                  <Button variant="ghost" size="lg" type="submit">Annuler</Button>
                </form>
              </div>
            </Action>
          )}
          {isSender && ["accepted", "paid"].includes(booking.status) && missingPhotos(photos, ["contents", "packed"]).length > 0 && (
            <p className="mb-5 rounded-2xl bg-warn-pale px-4 py-3 text-sm text-warn">
              Avant de remettre le colis, ajoutez les photos du contenu et du colis emballé (section « Photos du colis »). Le voyageur ne peut pas le prendre en charge sans elles.
            </p>
          )}
          {isSender && code && (
            <div className="rounded-2xl bg-ink p-5 text-white">
              <p className="flex items-center gap-2 text-sm text-white/70">
                <KeyRound className="h-4 w-4 text-signal" aria-hidden="true" /> Code de remise à transmettre à {booking.recipient_name}
              </p>
              <p className="wide tabular mt-2 text-4xl font-extrabold tracking-[0.3em] text-signal">{code}</p>
              <p className="mt-3 text-sm text-white/70">
                Ne le donnez jamais au voyageur vous-même. Votre destinataire le lui communique en recevant le colis.
                {booking.recipient_email && booking.recipient_notified_at ? ` Nous l'avons envoyé par e-mail à ${booking.recipient_name}.` : ""}
              </p>
            </div>
          )}
          {isTraveler && booking.status === "pending" && (
            <Action text="Vérifiez que le colis vous convient. Vous pourrez l'ouvrir au moment de la remise.">
              <div className="flex gap-2">
                <form action={declineBooking.bind(null, booking.id)}>
                  <Button variant="outline" type="submit">Refuser</Button>
                </form>
                <form action={acceptBooking.bind(null, booking.id)}>
                  <Button type="submit">Accepter la demande</Button>
                </form>
              </div>
            </Action>
          )}
          {isTraveler && booking.status === "accepted" && <Action text="En attente du paiement de l'expéditeur. Ne prenez pas le colis avant." />}
          {isTraveler && booking.status === "paid" && (
            missingForPickup.length ? (
              <Action
                text={`Paiement reçu : en attente du colis. Contrôlez le contenu devant ${senderName} et comparez-le à ses photos. Photos encore attendues : ${stepLabels(missingForPickup)}.`}
              />
            ) : (
              <Action text={`Paiement reçu : en attente du colis. Le colis correspond aux photos de ${senderName} ? Confirmez que vous l'avez reçu.`}>
                <form action={confirmPickup.bind(null, booking.id)}>
                  <Button type="submit">J&apos;ai reçu le colis</Button>
                </form>
              </Action>
            )
          )}
          {isTraveler && booking.status === "picked_up" && (
            <div className="space-y-5">
              {!hasEvent("departed") ? (
                <Action
                  text={
                    flight
                      ? `${flight} : le suivi passera automatiquement « en transit » au départ (${timeLabel(trip.departure_at, tz.from)}). Vous pouvez aussi le signaler vous-même.`
                      : "Tenez l'expéditeur informé : il suit son colis en direct."
                  }
                >
                  <form action={markTravelStep.bind(null, booking.id, "departed")}>
                    <Button type="submit">Je suis parti</Button>
                  </form>
                </Action>
              ) : !hasEvent("arrived") ? (
                <Action
                  text={
                    trip.arrival_at
                      ? `Bon voyage ! Le suivi passera à « Arrivé » à l'heure prévue (${timeLabel(trip.arrival_at, tz.to)}, heure locale). Arrivé plus tôt ? Signalez-le.`
                      : "Bon voyage ! Prévenez dès votre arrivée."
                  }
                >
                  <form action={markTravelStep.bind(null, booking.id, "arrived")}>
                    <Button type="submit">Je suis arrivé</Button>
                  </form>
                </Action>
              ) : null}
              {homeDelivery ? (
                hasEvent("arrived") && !hasEvent("out_for_delivery") ? (
                  <Action text="Livraison à domicile : remettez le colis au livreur partenaire Send By Me.">
                    <form action={markTravelStep.bind(null, booking.id, "out_for_delivery")}>
                      <Button type="submit">J&apos;ai remis le colis au livreur</Button>
                    </form>
                  </Action>
                ) : hasEvent("out_for_delivery") ? (
                  <Action text="Colis remis au livreur partenaire." />
                ) : null
              ) : missingForDelivery.length ? (
                <Action text={`À la remise, photographiez le colis encore emballé puis ouvert devant ${booking.recipient_name}. Photos attendues : ${stepLabels(missingForDelivery)}. Vous pourrez ensuite saisir son code.`} />
              ) : (
                <DeliveryCodeForm bookingId={booking.id} />
              )}
            </div>
          )}
          {booking.status === "delivered" && (
            <div className="space-y-6">
              <p role="status" className="rounded-2xl bg-ok-pale px-4 py-3 font-medium text-ok">
                Colis réceptionné.{" "}
                {isTraveler
                  ? `La transaction est terminée : ${euros(booking.base_cents)} vous seront versés dans les prochains jours.`
                  : `${booking.recipient_name} a bien reçu le colis et validé la réception avec son code.`}
              </p>
              {myReview ? (
                <p className="text-muted">Merci pour votre avis.</p>
              ) : (
                <ReviewForm bookingId={booking.id} subject={other?.full_name ?? "l'autre membre"} />
              )}
            </div>
          )}
          {booking.status === "refunded" && <p className="text-muted">Cette réservation a été remboursée à l&apos;expéditeur.</p>}
          {closed && booking.status !== "refunded" && <p className="text-muted">Cette réservation est close.</p>}
          {isSender && booking.status === "picked_up" && !code && <p className="text-muted">Le voyageur a reçu votre colis.</p>}
          {reportable && (
            <div className="mt-6 border-t border-line pt-5">
              <ReportForm bookingId={booking.id} />
            </div>
          )}
        </section>

        {(isSender || isTraveler) && (
          <ParcelPhotos
            bookingId={booking.id}
            photos={photos}
            role={isSender ? "sender" : "traveler"}
            status={booking.status}
            senderName={senderName}
            travelerName={travelerName}
          />
        )}
      </div>

      {/* Messagerie */}
      <aside className="flex max-h-[80vh] flex-col rounded-3xl bg-white ring-1 ring-line lg:sticky lg:top-6">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-5">
          <Avatar name={other?.full_name || "Membre"} verified={other?.id_verified} certified={other?.certified} src={other?.avatar_url} size={40} />
          <div>
            <p className="font-semibold">{other?.full_name || "Membre"}</p>
            <p className="text-sm text-muted">{isSender ? "Voyageur" : "Expéditeur"}</p>
          </div>
          {!closed && <CallPanel bookingId={booking.id} myId={userId} otherName={other?.full_name || "Membre"} />}
        </div>
        <ChatMessages messages={messages} myId={userId} empty="Posez vos questions ici : lieu de remise, photos du colis…" />
        {!closed && (
          <div className="border-t border-line p-4">
            <MessageForm bookingId={booking.id} />
          </div>
        )}
        <p className="px-5 pb-4 text-xs text-muted">
          Appelez et payez depuis Send By Me : votre numéro reste privé, et un paiement hors plateforme n&apos;est pas protégé.{" "}
          <Link href="/securite" className="underline">En savoir plus</Link>
        </p>
      </aside>
    </div>
  );
}

function Action({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-ink-soft">{text}</p>
      {children}
    </div>
  );
}

export default function BookingPage(props: PageProps<"/reservations/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[70vh] max-w-6xl" />}>
        <BookingView params={props.params} searchParams={props.searchParams as Promise<Record<string, string>>} />
      </Suspense>
    </PageShell>
  );
}
