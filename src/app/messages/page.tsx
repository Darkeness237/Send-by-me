import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { LiveInbox } from "@/components/live-refresh";
import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { getInbox } from "@/lib/data";
import { dayLabel, timeLabel } from "@/lib/format";
import { getUserId } from "@/lib/supabase/server";
import { STATUS_LABEL, type BookingStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

async function Inbox() {
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/messages");
  const threads = await getInbox(userId);
  const today = new Date().toDateString();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <LiveInbox />
      <h1 className="display text-3xl sm:text-4xl">Messages</h1>
      <p className="mt-2 text-muted">Vos discussions avec les voyageurs et les expéditeurs, avant et après réservation.</p>

      {threads.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-white p-8 text-center ring-1 ring-line">
          <MessageCircle className="mx-auto h-10 w-10 text-brand" aria-hidden="true" />
          <p className="mt-3 font-semibold">Aucune discussion pour l&apos;instant</p>
          <p className="mt-1 text-sm text-muted">Ouvrez un trajet et cliquez sur « Poser une question » pour écrire au voyageur.</p>
          <ButtonLink href="/recherche" className="mt-5">
            Trouver un voyageur
          </ButtonLink>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-3xl bg-white ring-1 ring-line">
          {threads.map((t) => (
            <li key={t.id}>
              <Link href={t.href} className="flex items-center gap-4 px-5 py-4 hover:bg-paper">
                <Avatar name={t.otherName} verified={t.otherVerified} certified={t.otherCertified} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2">
                    <span className={`truncate ${t.unread ? "font-bold" : "font-semibold"}`}>{t.otherName}</span>
                    <span className="truncate text-sm text-muted">{t.route}</span>
                  </p>
                  <p className={`truncate text-sm ${t.unread ? "font-semibold text-ink" : "text-muted"}`}>
                    {t.lastBody ?? (t.kind === "booking" ? `Réservation · ${STATUS_LABEL[t.status as BookingStatus] ?? ""}` : "Nouvelle discussion")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="tabular text-xs text-muted">
                    {new Date(t.lastAt).toDateString() === today ? timeLabel(t.lastAt) : dayLabel(t.lastAt)}
                  </span>
                  {t.unread > 0 && (
                    <span className="tabular min-w-5 rounded-full bg-brand px-1.5 text-center text-xs font-bold text-white" aria-label={`${t.unread} non lus`}>
                      {t.unread}
                    </span>
                  )}
                  {t.kind === "inquiry" && <span className="rounded-full bg-paper px-2 text-[11px] text-muted">Question</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-3xl" />}>
        <Inbox />
      </Suspense>
    </PageShell>
  );
}
