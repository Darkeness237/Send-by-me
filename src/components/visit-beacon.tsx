"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Signale chaque page vue au compteur de visites du site (sans cookie). */
export function VisitBeacon() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    // Provenance seulement pour la première page : les suivantes viennent du site lui-même.
    const ref = first.current ? document.referrer : "";
    first.current = false;
    const body = JSON.stringify({ path: pathname.replace(/^\/(fr|en)(?=\/|$)/, "") || "/", ref });
    try {
      if (!navigator.sendBeacon?.("/api/v", new Blob([body], { type: "application/json" }))) {
        void fetch("/api/v", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
      }
    } catch {}
  }, [pathname]);
  return null;
}
