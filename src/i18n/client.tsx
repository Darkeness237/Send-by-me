"use client";

import { createContext, useContext, useMemo } from "react";
import { translator, type Locale } from "./config";

const Ctx = createContext<Locale>("fr");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export const useLocale = () => useContext(Ctx);

export function useT() {
  const locale = useContext(Ctx);
  return useMemo(() => translator(locale), [locale]);
}
