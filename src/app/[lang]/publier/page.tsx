import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgeEuro, ShieldCheck, ThumbsUp } from "lucide-react";
import { JourneyHero } from "@/components/journey";
import { PageShell } from "@/components/page-shell";
import { PublishForm } from "@/components/publish-form";
import { getMarketPrices } from "@/lib/data";
import aeroport from "../../../../public/images/aeroport-depart.jpg";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Proposer mes kilos"),
    description: t("Publiez votre trajet et rentabilisez la place libre dans votre valise. Gratuit pour les voyageurs."),
  };
}

async function FormWithPrices() {
  return <PublishForm market={await getMarketPrices()} />;
}

export default async function PublishPage() {
  const t = await getT();
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
        <JourneyHero
          image={aeroport}
          alt={t("Une voyageuse attend son vol à l'aéroport")}
          position="50% 30%"
          eyebrow={t("Vous partez bientôt ?")}
          title={t("Proposer mes kilos")}
          text={t("Votre valise a de la place ? Des familles attendent un colis sur votre ligne. Vous choisissez qui vous aidez, et vous fixez votre prix.")}
          points={[
            [BadgeEuro, t("Vous fixez votre prix")],
            [ThumbsUp, t("Vous acceptez ou refusez")],
            [ShieldCheck, t("Voyageurs vérifiés")],
          ]}
        />
        <div className="mt-8">
          <Suspense fallback={<div className="h-[120vh] animate-pulse rounded-3xl bg-white ring-1 ring-line" />}>
            <FormWithPrices />
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}
