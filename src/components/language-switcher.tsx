"use client";

import { Globe } from "lucide-react";
import { LOCALE_COOKIE } from "@/i18n/config";
import { useLocale } from "@/i18n/client";

/** FR / EN : la langue est gardée un an dans un cookie ; la page se recharge dans la nouvelle langue. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const next = locale === "fr" ? "en" : "fr";
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        window.location.reload();
      }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-line hover:ring-brand ${className}`}
      aria-label={locale === "fr" ? "Switch to English" : "Passer en français"}
      lang={next}
    >
      <Globe className="h-4 w-4" aria-hidden="true" /> {next.toUpperCase()}
    </button>
  );
}
