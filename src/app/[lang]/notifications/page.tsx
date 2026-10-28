import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Bell, Mail, MessageCircle } from "lucide-react";
import { markAllNotificationsRead, setEmailNotifications, setWhatsAppNotifications } from "@/app/actions/notifications";
import { LiveInbox } from "@/components/live-refresh";
import { PageShell } from "@/components/page-shell";
import { PushToggle } from "@/components/push-toggle";
import { Button, ButtonLink } from "@/components/ui/button";
import { getNotifications, getProfile } from "@/lib/data";
import { dayLabel, timeLabel } from "@/lib/format";
import { createClient, getUserId } from "@/lib/supabase/server";
import { getLocale, getT } from "@/i18n/server";
import { translateDb } from "@/i18n/patterns";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Notifications"), robots: { index: false } };
}

async function Notifications() {
  const t = await getT();
  const lang = await getLocale();
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/notifications");
  const [items, profile] = await Promise.all([getNotifications(userId), getProfile(userId)]);
  const unread = items.filter((n) => !n.read_at).length;
  const emailOn = (profile as { email_notifications?: boolean } | null)?.email_notifications !== false;
  const whatsappOn = Boolean((profile as { whatsapp_notifications?: boolean } | null)?.whatsapp_notifications);
  const { data: contact } = await (await createClient()).from("member_contacts").select("phone_verified_at").eq("user_id", userId).maybeSingle();
  const phoneVerified = Boolean(contact?.phone_verified_at);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <LiveInbox />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">{t("Notifications")}</h1>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="ghost" size="sm">
              {t("Tout marquer comme lu")}
            </Button>
          </form>
        )}
      </div>

      <section className="mt-6 space-y-4 rounded-3xl bg-card p-6 ring-1 ring-line">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <Bell className="h-4 w-4 text-brand" aria-hidden="true" />{" "}{t("Sur ce téléphone ou cet ordinateur")}
          </p>
          <p className="mt-1 mb-3 text-sm text-muted">{t("Demandes, paiements, colis en route, nouveaux messages : soyez prévenu tout de suite.")}</p>
          <PushToggle />
        </div>
        <div className="border-t border-line pt-4">
          <p className="flex items-center gap-2 font-semibold">
            <Mail className="h-4 w-4 text-brand" aria-hidden="true" />{" "}{t("Par e-mail")}
          </p>
          <p className="mt-1 mb-3 text-sm text-muted">{t("Les étapes importantes de vos envois et réservations.")}</p>
          <form action={setEmailNotifications.bind(null, !emailOn)}>
            <Button type="submit" variant="outline" size="sm">
              {emailOn ? "Désactiver les e-mails" : "Activer les e-mails"}
            </Button>
          </form>
        </div>
        <div className="border-t border-line pt-4">
          <p className="flex items-center gap-2 font-semibold">
            <MessageCircle className="h-4 w-4 text-brand" aria-hidden="true" />{" "}{t("Par WhatsApp")}
          </p>
          <p className="mt-1 mb-3 text-sm text-muted">
            {t("Les mêmes étapes importantes, sur votre numéro vérifié. Jamais de publicité.")}
          </p>
          {phoneVerified ? (
            <form action={setWhatsAppNotifications.bind(null, !whatsappOn)}>
              <Button type="submit" variant="outline" size="sm">
                {whatsappOn ? t("Désactiver WhatsApp") : t("Activer WhatsApp")}
              </Button>
            </form>
          ) : (
            <ButtonLink href="/espace/profil" variant="outline" size="sm">
              {t("Vérifier mon numéro d'abord")}
            </ButtonLink>
          )}
        </div>
      </section>

      {items.length === 0 ? (
        <p className="mt-8 rounded-3xl bg-card p-8 text-center text-muted ring-1 ring-line">{t("Aucune notification pour l'instant.")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-3xl bg-card ring-1 ring-line">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.href ?? "/espace"} className={`flex gap-3 px-5 py-4 hover:bg-paper ${n.read_at ? "" : "bg-brand-pale/40"}`}>
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-signal"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={`block ${n.read_at ? "font-semibold" : "font-bold"}`}>{translateDb(n.title, lang)}</span>
                  {n.body && <span className="block text-sm text-ink-soft">{translateDb(n.body, lang)}</span>}
                  <span className="tabular mt-1 block text-xs text-muted">
                    {dayLabel(n.created_at, undefined, lang)}, {timeLabel(n.created_at, undefined, lang)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-2xl" />}>
        <Notifications />
      </Suspense>
    </PageShell>
  );
}
