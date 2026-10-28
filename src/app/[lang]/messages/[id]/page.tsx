import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { MessageForm } from "@/components/booking-client-forms";
import { ChatMessages } from "@/components/chat-messages";
import { LiveRefresh } from "@/components/live-refresh";
import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { getInquiry, getThreadMessages, markThreadRead } from "@/lib/data";
import { longDate } from "@/lib/format";
import { tzFor } from "@/lib/places";
import { euros } from "@/lib/pricing";
import { getUserId } from "@/lib/supabase/server";
import { getLocale, getT } from "@/i18n/server";
import { BackLink } from "@/components/ui/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Discussion"), robots: { index: false } };
}

async function Conversation({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const lang = await getLocale();
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) redirect(`/connexion?suite=/messages/${id}`);
  const inquiry = await getInquiry(id); // RLS : null si le membre ne participe pas
  if (!inquiry) notFound();
  const [messages] = await Promise.all([getThreadMessages({ inquiryId: inquiry.id }), markThreadRead(userId, inquiry.id)]);

  const isSender = inquiry.sender_id === userId;
  const other = isSender ? inquiry.traveler : inquiry.sender;
  const trip = inquiry.trip;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <LiveRefresh inquiryId={inquiry.id} />
      <BackLink href="/messages" label={t("Messages")} />
      <div className="mt-4 flex h-[75vh] flex-col rounded-3xl bg-white ring-1 ring-line">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-5">
          <Avatar name={other?.full_name || "Membre"} verified={other?.id_verified} certified={other?.certified} size={44} />
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold">{other?.full_name || t("Membre")}</h1>
            {trip && (
              <p className="truncate text-sm text-muted">
                {isSender ? t("Voyageur") : t("Expéditeur intéressé")} · {trip.from_city} → {trip.to_city}, {longDate(trip.departure_at, tzFor(trip.from_city), lang)}
              </p>
            )}
          </div>
          {trip && isSender && trip.status === "published" && (
            <ButtonLink href={`/trajets/${trip.id}`} size="sm">
              {t("Réserver · {euros}/kg", { euros: euros(trip.price_per_kg_cents) })}
            </ButtonLink>
          )}
        </div>
        <ChatMessages
          messages={messages}
          myId={userId}
          empty={isSender ? t("Posez votre question : type de colis, lieu de remise, délai…") : t("L'expéditeur n'a pas encore écrit.")}
        />
        <div className="border-t border-line p-4">
          <MessageForm inquiryId={inquiry.id} />
        </div>
        <p className="px-5 pb-4 text-xs text-muted">
          {t("Gardez la discussion et le paiement sur Send By Me : un paiement hors plateforme n'est ni protégé ni remboursable.")}
        </p>
      </div>
    </div>
  );
}

export default function ConversationPage(props: PageProps<"/[lang]/messages/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[75vh] max-w-3xl" />}>
        <Conversation params={props.params} />
      </Suspense>
    </PageShell>
  );
}
