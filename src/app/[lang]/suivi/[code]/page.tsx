import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { House, MapPin, PackageSearch } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { TrackingTimeline } from "@/components/tracking-timeline";
import { ButtonLink } from "@/components/ui/button";
import { trackShipment } from "@/lib/data";
import { DELIVERY_STATUS_LABEL, type DeliveryStatus } from "@/lib/delivery";
import { kg, longDate } from "@/lib/format";
import { codeFor, tzFor } from "@/lib/places";
import { advanceTransit } from "@/lib/transit";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Suivi de colis"), robots: { index: false } };
}

async function Shipment({ params }: { params: Promise<{ code: string }> }) {
  const t = await getT();
  const lang = await getLocale();
  const { code } = await params;
  await advanceTransit().catch(() => 0); // étapes « en transit » et « arrivé » d'après les horaires
  const s = await trackShipment(decodeURIComponent(code));
  if (!s) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14 text-center sm:px-6">
        <PackageSearch className="mx-auto h-10 w-10 text-muted" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">{t("Numéro de suivi introuvable")}</h1>
        <p className="mt-2 text-muted">{t("Vérifiez le numéro transmis par l'expéditeur (format SBM-XXXXXXXX).")}</p>
        <ButtonLink href="/suivi" variant="outline" className="mt-6">
          {t("Saisir un autre numéro")}
        </ButtonLink>
      </div>
    );
  }
  const tz = s.from_tz ?? tzFor(s.from_city);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="wide tabular text-sm font-bold text-muted">{s.code}</p>
      <section className="mt-2 overflow-hidden rounded-3xl bg-ink text-white">
        <div className="flex items-center justify-between gap-4 p-6">
          <div>
            <p className="display text-4xl text-signal">{codeFor(s.from_city)}</p>
            <p className="text-white/75">{s.from_city}</p>
          </div>
          <span className="h-px flex-1 border-t border-dashed border-white/30" aria-hidden="true" />
          <div className="text-right">
            <p className="display text-4xl text-signal">{codeFor(s.to_city)}</p>
            <p className="text-white/75">{s.to_city}</p>
          </div>
        </div>
        <p className="border-t border-dashed border-white/20 px-6 py-3 text-sm text-white/75">
          {t("Départ {longDate} · {kg}{v}", { longDate: longDate(s.departure_at, tz, lang), kg: kg(s.weight_kg), v: s.transport_ref ? t(" · vol {ref}", { ref: s.transport_ref }) : "" })}
        </p>
      </section>

      <section className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
        <h1 className="mb-5 text-lg font-bold">{t("Où en est le colis ?")}</h1>
        <TrackingTimeline events={s.events} homeDelivery={s.home_delivery} details={s.transport_ref ? { departed: `Vol ${s.transport_ref}` } : {}} />
        <p className="mt-6 flex items-start gap-2 rounded-2xl bg-paper p-4 text-sm text-ink-soft">
          {s.home_delivery ? (
            <>
              <House className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              {t("{v}. Notre livreur partenaire vous contacte avant de passer.", { v: t(DELIVERY_STATUS_LABEL[(s.delivery_status as DeliveryStatus) ?? "requested"]) })}
            </>
          ) : (
            <>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              {t("Remise en main propre par le voyageur. Donnez-lui le code de remise envoyé par l'expéditeur, seulement une fois le colis reçu.")}
            </>
          )}
        </p>
      </section>
      <p className="mt-6 text-center text-sm text-muted">
        {t("Vous aussi, envoyez vos colis avec des voyageurs vérifiés.")}{" "}
        <Link href="/recherche" className="font-semibold text-brand">
          {t("Trouver un voyageur")}
        </Link>
      </p>
    </div>
  );
}

export default function ShipmentPage(props: PageProps<"/[lang]/suivi/[code]">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[70vh] max-w-2xl" />}>
        <Shipment params={props.params} />
      </Suspense>
    </PageShell>
  );
}
