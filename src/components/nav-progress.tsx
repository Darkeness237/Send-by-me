"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Barre de progression en haut de l'écran dès le clic sur un lien interne :
 * le membre voit tout de suite que la page suivante arrive, même sur un réseau lent.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const here = `${pathname}?${search}`;
  // Adresse au moment du clic : tant qu'elle est affichée, la page suivante charge.
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const phase = startedAt === null ? "idle" : startedAt === here ? "loading" : "done";

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // ancre ou même page
      setStartedAt(`${location.pathname}?${location.search.slice(1)}`);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Nouvelle adresse affichée : on termine la barre puis on la cache.
  useEffect(() => {
    if (phase !== "done") return;
    const timer = setTimeout(() => setStartedAt(null), 400);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "idle") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]" aria-hidden="true">
      <div className={`nav-progress h-full bg-gradient-to-r from-signal to-brand ${phase === "done" ? "nav-progress--done" : ""}`} />
    </div>
  );
}
