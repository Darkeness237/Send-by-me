"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { MessageCircle, PackagePlus, Plane, Search, UserRound } from "lucide-react";
import { useT } from "@/i18n/client";

const TABS = [
  { href: "/recherche", label: "Trouver", icon: Search },
  { href: "/publier", label: "Mes kilos", icon: Plane },
  { href: "/demandes/nouvelle", label: "Envoyer", icon: PackagePlus, primary: true },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/espace", label: "Espace", icon: UserRound },
];

/** Barre d'onglets en bas d'écran sur mobile (comme une application) : envoyer et proposer ses kilos à portée de pouce. */
export function MobileTabBar() {
  // L'onglet actif dépend de l'adresse : rendu sans onglet actif en attendant, pour ne pas bloquer la page.
  return (
    <Suspense fallback={<TabBar path="" />}>
      <ActiveTabBar />
    </Suspense>
  );
}

function ActiveTabBar() {
  return <TabBar path={usePathname()} />;
}

function TabBar({ path }: { path: string }) {
  const t = useT();
  return (
    <nav
      aria-label={t("Navigation principale")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ href, label, icon: Icon, primary }) => {
          const active = path === href || (href !== "/" && path.startsWith(`${href}/`));
          return (
            <li key={href}>
              <Link href={href} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold" aria-current={active ? "page" : undefined}>
                {primary ? (
                  <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-fill text-white shadow-lg ring-4 ring-card">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                ) : (
                  <Icon className={`h-5 w-5 ${active ? "text-brand" : "text-muted"}`} aria-hidden="true" />
                )}
                <span className={primary ? "text-brand" : active ? "text-brand" : "text-muted"}>{t(label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
