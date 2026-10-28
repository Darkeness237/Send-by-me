// Langues du site. Le texte source est le français : chaque chaîne française sert de clé,
// et le dictionnaire anglais donne sa traduction (repli sur le français si elle manque).
import { en } from "./en";

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "sbm_lang";

export const isLocale = (v: unknown): v is Locale => v === "fr" || v === "en";

export type Vars = Record<string, string | number>;
export type T = (fr: string, vars?: Vars) => string;

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);

export function translator(locale: Locale): T {
  if (locale === "fr") return (fr, vars) => fill(fr, vars);
  return (fr, vars) => fill(en[fr] ?? fr, vars);
}

/** Format de dates et de nombres selon la langue. */
export const intlLocale = (locale: Locale) => (locale === "en" ? "en-GB" : "fr-FR");
