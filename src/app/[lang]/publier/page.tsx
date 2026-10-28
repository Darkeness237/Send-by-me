import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgeEuro, ShieldCheck, ThumbsUp } from "lucide-react";
import { JourneyHero } from "@/components/journey";
import { PageShell } from "@/components/page-shell";
import { PublishForm } from "@/components/publish-form";
import { getMarketPrices } from "@/lib/data";
import voyageuse from "../../../../public/images/voyageuse-prepare.jpg";
import { getT } from "@/i18n/server";
import { GuestGate } from "@/components/guest-gate";
import { getUserId } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Proposer mes kilos"),
    description: t("Publiez votre trajet et rentabilisez la place libre dans votre valise. Gratuit pour les voyageurs."),
  };
}

async function FormWithPrices() {
  if (!(await getUserId())) {
    const t = await getT();
    return (
      <GuestGate
        next="/publier"
        title={t("Publiez votre trajet gratuitement")}
        reasons={[
          t("Vous fixez votre prix au kilo et choisissez les colis acceptés."),
          t("Chaque colis vous est montré ouvert avant d'être fermé."),
          t("Vous êtes payé après la remise, validée par le code du destinataire."),
          t("Vos 3 premiers trajets sont mis en avant gratuitement."),
        ]}
      />
    );
  }
  return <PublishForm market={await getMarketPrices()} />;
}

export default async function PublishPage() {
  const t = await getT();
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
        <JourneyHero
          image={voyageuse}
          alt={t("Une voyageuse souriante prépare sa valise")}
          position="50% 25%"
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
          <Suspense fallback={<div className="h-[120vh] animate-pulse rounded-3xl bg-card ring-1 ring-line" />}>
            <FormWithPrices />
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}
