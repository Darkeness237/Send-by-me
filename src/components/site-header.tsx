import Link from "next/link";
import { Suspense } from "react";
import { Bell, MessageCircle, PackagePlus, Plus } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";
import { getUnreadCount, getUnreadNotificationCount } from "@/lib/data";
import { getUserId } from "@/lib/supabase/server";

async function AccountLinks({ dark }: { dark: boolean }) {
  const userId = await getUserId();
  if (userId) {
    const [unread, alerts] = await Promise.all([getUnreadCount(userId), getUnreadNotificationCount(userId)]);
    return (
      <>
        <Link
          href="/notifications"
          aria-label={alerts ? `Notifications, ${alerts} non lues` : "Notifications"}
          className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full ${dark ? "hover:bg-white/10" : "hover:bg-ink/5"}`}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {alerts > 0 && (
            <span className="tabular absolute -top-0.5 -right-0.5 min-w-4.5 rounded-full bg-signal px-1 text-center text-[11px] leading-4.5 font-bold text-ink">
              {alerts > 9 ? "9+" : alerts}
            </span>
          )}
        </Link>
        <Link
          href="/messages"
          aria-label={unread ? `Messages, ${unread} non lus` : "Messages"}
          className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full ${dark ? "hover:bg-white/10" : "hover:bg-ink/5"}`}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          {unread > 0 && (
            <span className="tabular absolute -top-0.5 -right-0.5 min-w-4.5 rounded-full bg-signal px-1 text-center text-[11px] leading-4.5 font-bold text-ink">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <Link href="/espace" className={buttonClass("outline", "sm")}>
          Mon espace
        </Link>
      </>
    );
  }
  return (
    <>
      <Link href="/connexion" className={buttonClass("ghost", "sm", dark ? "text-white hover:bg-white/10" : "")}>
        Se connecter
      </Link>
      <Link href="/inscription" className={`${buttonClass("outline", "sm")} max-sm:hidden`}>
        Créer un compte
      </Link>
    </>
  );
}

export function SiteHeader({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <header className={dark ? "bg-ink text-white" : "border-b border-line bg-white"}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Send By Me, accueil" className="shrink-0">
          <Logo tone={dark ? "light" : "dark"} />
        </Link>
        <nav className={`ml-2 hidden items-center gap-0.5 text-sm font-medium lg:flex ${dark ? "text-white/80" : "text-ink-soft"}`}>
          <Link href="/recherche" className={`rounded-full px-3 py-2 whitespace-nowrap ${dark ? "hover:bg-white/10" : "hover:bg-ink/5"}`}>
            Trouver un voyageur
          </Link>
          <Link href="/demandes" className={`rounded-full px-3 py-2 whitespace-nowrap ${dark ? "hover:bg-white/10" : "hover:bg-ink/5"}`}>
            Demandes d&apos;envoi
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {/* Les deux actions principales, au même niveau : envoyer (demande) et transporter (trajet). */}
          <span className="hidden items-center gap-2 md:flex">
            <Link href="/demandes/nouvelle" className={buttonClass("primary", "sm")}>
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              Envoyer un colis
            </Link>
            <Link href="/publier" className={buttonClass("signal", "sm")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Proposer mes kilos
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
