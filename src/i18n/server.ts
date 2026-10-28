import "server-only";

import { cookies } from "next/headers";
import { lang } from "next/root-params";
import { isLocale, LOCALE_COOKIE, translator, type Locale } from "./config";

/** Langue de la page (composants serveur) : segment racine [lang], posé par le proxy. */
export async function getLocale(): Promise<Locale> {
  const l = await lang();
  return isLocale(l) ? l : "fr";
}

export async function getT() {
  return translator(await getLocale());
}

/** Actions serveur et routes : la langue vient du cookie (le segment n'y est pas accessible). */
export async function getActionLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(c) ? c : "fr";
}

export async function getActionT() {
  return translator(await getActionLocale());
}
