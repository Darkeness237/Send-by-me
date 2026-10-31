"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";

// Identifiant public du compte Google Ads (il figure dans le code de la page, ce n'est pas un secret).
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "AW-18547837088";
const KEY = "sbm-consent";
export const OPEN_CONSENT_EVENT = "sbm:open-consent";

type Choice = "granted" | "denied";

const CHANGE_EVENT = "sbm:consent-change";

function readChoice(): Choice | "unset" {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : "unset";
  } catch {
    return "unset";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Cookies publicitaires Google Ads : rien n'est chargé tant que le visiteur n'a pas accepté.
 * « Refuser » est aussi simple qu'« Accepter », et le choix se modifie depuis le pied de page.
 */
export function AdsConsent() {
  const t = useT();
  // Côté serveur, le choix est inconnu : rien n'est affiché ni chargé avant l'hydratation.
  const stored = useSyncExternalStore(subscribe, readChoice, () => "ssr" as const);
  // Choix fait pendant cette visite : compte même si le navigateur bloque le stockage (navigation privée).
  const [session, setSession] = useState<Choice | null>(null);
  const choice = session ?? stored;
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  const open = choice === "unset" || reopened;

  const decide = (c: Choice) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      // Navigation privée : le choix n'est pas retenu, la bannière reviendra à la prochaine visite.
    }
    setReopened(false);
    setSession(c);
    // Retrait du consentement : on recharge pour que le tag déjà chargé disparaisse.
    if (choice === "granted" && c === "denied") return window.location.reload();
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <>
      {choice === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`} strategy="afterInteractive" />
          <Script id="google-ads" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ADS_ID}');`}
          </Script>
        </>
      )}
      {open && (
        <div role="dialog" aria-live="polite" aria-label={t("Cookies")} className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 mx-auto max-w-xl rounded-3xl bg-card p-5 shadow-[0_20px_60px_rgb(14_48_76/0.25)] ring-1 ring-line md:bottom-5">
          <p className="text-[15px] leading-relaxed text-ink">
            {t("Nous aimerions utiliser des cookies Google Ads pour mesurer l'efficacité de nos publicités. Le site fonctionne de la même façon si vous refusez.")}{" "}
            <Link href="/confidentialite#cookies" className="font-semibold text-brand underline underline-offset-2">
              {t("En savoir plus")}
            </Link>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => decide("denied")} className="h-11 rounded-full font-bold text-ink ring-1 ring-line hover:bg-paper">
              {t("Refuser")}
            </button>
            <button type="button" onClick={() => decide("granted")} className="h-11 rounded-full bg-night font-bold text-white hover:bg-night-soft">
              {t("Accepter")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Lien du pied de page pour revoir son choix. */
export function ConsentLink({ className }: { className?: string }) {
  const t = useT();
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>
      {t("Cookies")}
    </button>
  );
}
