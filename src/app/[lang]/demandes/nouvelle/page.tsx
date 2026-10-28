import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Bell, Camera, Users } from "lucide-react";
import { JourneyHero } from "@/components/journey";
import { PageShell } from "@/components/page-shell";
import { RequestForm } from "@/components/request-form";
import { getUserId } from "@/lib/supabase/server";
import remise from "../../../../../public/images/remise-colis.jpg";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Publier une demande d'envoi"), robots: { index: false } };
}

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/demandes/nouvelle");
  const sp = await searchParams;
  return <RequestForm userId={userId} defaults={{ from: sp.from, to: sp.to }} />;
}

export default async function NewRequestPage(props: PageProps<"/[lang]/demandes/nouvelle">) {
  const t = await getT();
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
        <JourneyHero
          image={remise}
          alt={t("Un colis passe de main en main")}
          eyebrow={t("Envoyer un colis")}
          title={t("Publier une demande d'envoi")}
          text={t("Dites-nous ce que vous envoyez et où. Les voyageurs qui partent sur votre ligne vous contactent.")}
          points={[
            [Camera, t("Ajoutez des photos")],
            [Users, t("Les voyageurs vous écrivent")],
            [Bell, t("Prévenu à chaque nouveau trajet")],
          ]}
        />
        <div className="mt-8">
          <Suspense fallback={<div className="h-[80vh] rounded-3xl bg-white ring-1 ring-line" />}>
            <Form searchParams={props.searchParams as Promise<Record<string, string | undefined>>} />
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}
