import type { ReactNode } from "react";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function PageShell({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[60vh]">{children}</main>
      {footer && <SiteFooter />}
      <MobileTabBar />
    </>
  );
}
