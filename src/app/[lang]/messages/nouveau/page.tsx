import type { Metadata } from "next";
import { Suspense } from "react";
import { startInquiry } from "@/app/actions/messages";
import { PageShell } from "@/components/page-shell";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Discussion"), robots: { index: false } };
}

/**
 * « Poser une question » : un simple lien vers cette page, qui ouvre (ou retrouve) la discussion
 * puis redirige côté serveur. Plus fiable qu'une redirection depuis une action de formulaire.
 */
async function Open({ searchParams }: { searchParams: Promise<{ trajet?: string }> }) {
  const { trajet } = await searchParams;
  await startInquiry(String(trajet ?? ""));
  return null;
}

export default function NewConversationPage(props: PageProps<"/[lang]/messages/nouveau">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-3xl" />}>
        <Open searchParams={props.searchParams as Promise<{ trajet?: string }>} />
      </Suspense>
    </PageShell>
  );
}
