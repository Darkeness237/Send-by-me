"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { maskedUrl } from "@/lib/analytics";

/** Pages vues envoyées à Plausible (script « manual ») avec une adresse masquée, à chaque navigation. */
export function PlausiblePageviews() {
  const pathname = usePathname();
  useEffect(() => {
    window.plausible?.("pageview", { u: maskedUrl(pathname) });
  }, [pathname]);
  return null;
}
