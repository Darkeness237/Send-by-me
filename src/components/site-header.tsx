import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";
import { getUserId } from "@/lib/supabase/server";

async function AccountLinks({ dark }: { dark: boolean }) {
  const userId = await getUserId();
  if (userId) {
    return (
      <Link href="/espace" className={buttonClass("outline", "sm")}>
        Mon espace
      </Link>
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
        <nav className={`ml-4 hidden items-center gap-1 text-sm font-medium md:flex ${dark ? "text-white/80" : "text-ink-soft"}`}>
          <Link href="/recherche" className={`rounded-full px-3 py-2 ${dark ? "hover:bg-white/10" : "hover:bg-ink/5"}`}>
            Trouver un voyageur
          </Link>
          <Link href="/comment-ca-marche" className={`rounded-full px-3 py-2 ${dark ? "hover:bg-white/10" : "hover:bg-ink/5"}`}>
            Comment ça marche
          </Link>
          <Link href="/securite" className={`rounded-full px-3 py-2 ${dark ? "hover:bg-white/10" : "hover:bg-ink/5"}`}>
            Sécurité
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:block">
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
