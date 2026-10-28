import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import { Logo } from "@/components/logo";
import { PageShell } from "@/components/page-shell";
import { PrintButton } from "@/components/print-button";
import { getBooking } from "@/lib/data";
import { SITE_URL } from "@/lib/env";
import { kg, longDate } from "@/lib/format";
import { codeFor, tzFor } from "@/lib/places";
import { getUserId } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";
import { getLocale, getT } from "@/i18n/server";
import { BackLink } from "@/components/ui/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Étiquette du colis"), robots: { index: false } };
}

/** Étiquette à imprimer et coller sur le colis : numéro de suivi, QR code, trajet, destinataire (prénom seulement). */
async function Label({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const lang = await getLocale();
  const userId = await getUserId();
  const { id } = await params;
  if (!userId) redirect(`/connexion?suite=/reservations/${id}/etiquette`);
  const booking = await getBooking(id); // RLS : participants uniquement
  if (!booking?.trip || !booking.tracking_code) notFound();
  if (!["accepted", "paid", "picked_up"].includes(booking.status)) redirect(`/reservations/${id}`);
  const trip = booking.trip;
  const trackUrl = `${SITE_URL}/suivi/${booking.tracking_code}`;
  const qr = await QRCode.toString(trackUrl, { type: "svg", margin: 0, color: { dark: "#0e304c", light: "#ffffff" } });
  const recipientFirstName = booking.recipient_name.split(" ")[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <BackLink href={`/reservations/${id}`} label={t("Ma réservation")} />
      <h1 className="display mt-4 text-3xl sm:text-4xl">{t("Étiquette du colis")}</h1>
      <p className="mt-2 max-w-xl text-muted">
        {t("Imprimez-la, collez-la bien à plat sur le colis fermé, puis prenez la photo « colis emballé » avec l'étiquette visible. Le voyageur et votre destinataire retrouvent le même numéro dans le suivi.")}
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="print-area w-[420px] max-w-full rounded-xl border-2 border-dashed border-ink bg-card p-5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <Logo />
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">{t("Colis voyageur")}</span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="wide tabular text-4xl font-extrabold text-ink">{codeFor(trip.from_city)}</span>
            <span className="h-0.5 flex-1 bg-night" aria-hidden="true" />
            <span className="wide tabular text-4xl font-extrabold text-ink">{codeFor(trip.to_city)}</span>
          </div>
          <p className="mt-1 flex justify-between text-sm text-ink-soft">
            <span>{trip.from_city}</span>
            <span>{trip.to_city}</span>
          </p>
          <div className="mt-4 flex gap-4">
            <div className="h-28 w-28 shrink-0" dangerouslySetInnerHTML={{ __html: qr }} />
            <dl className="min-w-0 text-sm">
              <dt className="text-xs text-muted">{t("N° de suivi")}</dt>
              <dd className="wide tabular text-xl font-extrabold tracking-wider text-ink">{booking.tracking_code}</dd>
              <dt className="mt-2 text-xs text-muted">{t("Pour")}</dt>
              <dd className="font-semibold text-ink">
                {recipientFirstName}, {trip.to_city}
              </dd>
              <dt className="mt-2 text-xs text-muted">{t("Départ")}</dt>
              <dd className="text-ink">{longDate(trip.departure_at, tzFor(trip.from_city), lang)}</dd>
            </dl>
          </div>
          <p className="mt-4 border-t border-line pt-3 text-xs text-ink-soft">
            {t("{kg} · {label}. Remis en main propre contre le code de réception du destinataire. Suivi : send-by-me.com/suivi", { kg: kg(booking.weight_kg), label: t(CATEGORIES.find((c) => c.id === booking.category)?.label ?? "") })}
          </p>
        </div>
        <PrintButton label={t("Imprimer l'étiquette")} />
      </div>
      <p className="mt-4 text-sm text-muted">
        {t("L'étiquette ne montre ni le nom complet ni le téléphone du destinataire. Pas d'imprimante ? Recopiez le numéro de suivi au marqueur sur le colis.")}
      </p>
    </div>
  );
}

export default function LabelPage(props: PageProps<"/[lang]/reservations/[id]/etiquette">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-3xl" />}>
        <Label params={props.params} />
      </Suspense>
    </PageShell>
  );
}
