import Link from "next/link";
import { Suspense } from "react";
import { Bell, MessageCircle, PackagePlus, Plus } from "lucide-react";
import { AutoPush } from "@/components/auto-push";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";
import { getUnreadCount, getUnreadNotificationCount } from "@/lib/data";
import { getUserId } from "@/lib/supabase/server";
import { getT } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";

async function AccountLinks({ dark }: { dark: boolean }) {
  const userId = await getUserId();
  const t = await getT();
  if (userId) {
    const [unread, alerts] = await Promise.all([getUnreadCount(userId), getUnreadNotificationCount(userId)]);
    return (
      <>
        <AutoPush />
        <Link
          href="/notifications"
          aria-label={alerts ? t("Notifications, {n} non lues", { n: alerts }) : t("Notifications")}
          className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full ${dark ? "hover:bg-white/10" : "hover:bg-ink/5"}`}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {alerts > 0 && (
            <span className="tabular absolute -top-0.5 -right-0.5 min-w-4.5 rounded-full bg-signal px-1 text-center text-[11px] leading-4.5 font-bold text-navy">
              {alerts > 9 ? "9+" : alerts}
            </span>
          )}
        </Link>
        <Link
          href="/messages"
          aria-label={unread ? t("Messages, {n} non lus", { n: unread }) : t("Messages")}
          className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full ${dark ? "hover:bg-white/10" : "hover:bg-ink/5"}`}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          {unread > 0 && (
            <span className="tabular absolute -top-0.5 -right-0.5 min-w-4.5 rounded-full bg-signal px-1 text-center text-[11px] leading-4.5 font-bold text-navy">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <Link href="/espace" className={buttonClass("outline", "sm")}>
          {t("Mon espace")}
        </Link>
      </>
    );
  }
  return (
    <>
      <Link href="/connexion" className={buttonClass("ghost", "sm", dark ? "text-white hover:bg-white/10" : "")}>
        {t("Se connecter")}
      </Link>
      <Link href="/inscription" className={`${buttonClass("outline", "sm")} max-sm:hidden`}>
        {t("Créer un compte")}
      </Link>
    </>
  );
}

export async function SiteHeader({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  const t = await getT();
  return (
    <header className={dark ? "bg-night text-white" : "border-b border-line bg-card"}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={t("Send By Me, accueil")} className="shrink-0">
          <Logo tone={dark ? "light" : "dark"} />
        </Link>
        <nav className={`ml-2 hidden items-center gap-0.5 text-sm font-medium lg:flex ${dark ? "text-white/80" : "text-ink-soft"}`}>
          <Link href="/recherche" className={`rounded-full px-3 py-2 whitespace-nowrap ${dark ? "hover:bg-white/10" : "hover:bg-ink/5"}`}>
            {t("Trouver un voyageur")}
          </Link>
          <Link href="/demandes" className={`rounded-full px-3 py-2 whitespace-nowrap ${dark ? "hover:bg-white/10" : "hover:bg-ink/5"}`}>
            {t("Demandes d'envoi")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher className="max-sm:hidden" />
          {/* Les deux actions principales, au même niveau : envoyer (demande) et transporter (trajet). */}
          <span className="hidden items-center gap-2 md:flex">
            <Link href="/demandes/nouvelle" className={buttonClass("primary", "sm")}>
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              {t("Envoyer un colis")}
            </Link>
            <Link href="/publier" className={buttonClass("signal", "sm")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("Proposer mes kilos")}
            </Link>
          </span>
          <Suspense fallback={<span className="h-9 w-28" />}>
            <AccountLinks dark={dark} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
