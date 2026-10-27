import type { ReactNode } from "react";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isSupabaseConfigured } from "@/lib/env";

export function PageShell({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <>
      {!isSupabaseConfigured && (
        <p className="bg-signal px-4 py-2 text-center text-sm font-medium text-ink">
          Mode démo : les trajets affichés sont des exemples. Connectez Supabase pour activer les comptes et les réservations.
        </p>
      )}
      <SiteHeader />
      <main className="min-h-[60vh]">{children}</main>
      {footer && <SiteFooter />}
      <MobileTabBar />
    </>
  );
}
