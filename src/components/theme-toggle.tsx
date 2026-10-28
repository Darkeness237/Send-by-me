"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { THEME_EVENT, THEME_KEY, type ThemePref } from "@/lib/theme";
import { useT } from "@/i18n/client";

function read(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}
function subscribe(cb: () => void) {
  addEventListener(THEME_EVENT, cb);
  addEventListener("storage", cb);
  return () => {
    removeEventListener(THEME_EVENT, cb);
    removeEventListener("storage", cb);
  };
}
function choose(pref: ThemePref) {
  try {
    if (pref === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {}
  dispatchEvent(new Event(THEME_EVENT));
}

const OPTIONS = [
  ["auto", SunMoon, "Auto"],
  ["light", Sun, "Clair"],
  ["dark", Moon, "Sombre"],
] as const;

/** Choix du thème : automatique (suit le téléphone), clair ou sombre. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const t = useT();
  const pref = useSyncExternalStore(subscribe, read, () => "auto" as ThemePref);
  return (
    <div role="radiogroup" aria-label={t("Thème d'affichage")} className={`inline-flex rounded-full bg-paper p-1 ring-1 ring-line ${className}`}>
      {OPTIONS.map(([value, Icon, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          onClick={() => choose(value)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${pref === value ? "bg-card text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {t(label)}
        </button>
      ))}
    </div>
  );
}
