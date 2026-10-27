import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgeEuro, ShieldCheck, ThumbsUp } from "lucide-react";
import { JourneyHero } from "@/components/journey";
import { PageShell } from "@/components/page-shell";
import { PublishForm } from "@/components/publish-form";
import { getMarketPrices } from "@/lib/data";
import aeroport from "../../../public/images/aeroport-depart.jpg";

export const metadata: Metadata = {
  title: "Proposer mes kilos",
  description: "Publiez votre trajet et rentabilisez la place libre dans votre valise. Gratuit pour les voyageurs.",
};

async function FormWithPrices() {
  return <PublishForm market={await getMarketPrices()} />;
}

export default function PublishPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
        <JourneyHero
          image={aeroport}
          alt="Une voyageuse attend son vol à l'aéroport"
          position="50% 30%"
          eyebrow="Vous partez bientôt ?"
          title="Proposer mes kilos"
          text="Votre valise a de la place ? Des familles attendent un colis sur votre ligne. Vous choisissez qui vous aidez, et vous êtes payé à la remise."
          points={[
            [BadgeEuro, "Vous fixez votre prix"],
            [ThumbsUp, "Vous acceptez ou refusez"],
            [ShieldCheck, "Paiement garanti"],
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
