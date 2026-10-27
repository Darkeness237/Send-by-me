import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { RequestForm } from "@/components/request-form";
import { getUserId } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Publier une demande d'envoi", robots: { index: false } };

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/demandes/nouvelle");
  const sp = await searchParams;
  return <RequestForm userId={userId} defaults={{ from: sp.from, to: sp.to }} />;
}

export default function NewRequestPage(props: PageProps<"/demandes/nouvelle">) {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="display text-3xl sm:text-4xl">Publier une demande d&apos;envoi</h1>
        <p className="mt-3 max-w-xl text-muted">
          Décrivez votre colis : nous vous montrons les trajets qui correspondent, et les voyageurs concernés sont prévenus.
        </p>
        <div className="mt-8">
          <Suspense fallback={<div className="h-[80vh] rounded-3xl bg-white ring-1 ring-line" />}>
            <Form searchParams={props.searchParams as Promise<Record<string, string | undefined>>} />
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}
