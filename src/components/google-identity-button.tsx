"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "@/i18n/client";
import { createClient } from "@/lib/supabase/client";

type GoogleId = {
  accounts: {
    id: {
      initialize: (o: Record<string, unknown>) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};

const SCRIPT = "https://accounts.google.com/gsi/client";

const sha256 = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * Connexion Google ouverte depuis send-by-me.com (Google Identity Services) : l'écran de Google
 * affiche notre site, pas l'adresse technique de Supabase. Le jeton Google est ensuite échangé contre
 * une session Supabase. Tant que le bouton Google n'est pas prêt, l'ancien bouton (redirection) reste affiché.
 */
export function GoogleIdentityButton({ clientId, next, referral, children }: { clientId: string; next?: string; referral?: string; children: React.ReactNode }) {
  const t = useT();
  const lang = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      const g = (window as unknown as { google?: GoogleId }).google;
      if (!g || !box.current || cancelled) return;
      const raw = crypto.randomUUID();
      g.accounts.id.initialize({
        client_id: clientId,
        nonce: await sha256(raw),
        ux_mode: "popup",
        itp_support: true,
        callback: async ({ credential }: { credential: string }) => {
          setError(null);
          const { error: e } = await createClient().auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
          if (e) {
            console.error("Connexion Google", e.message);
            setError(t("La connexion avec Google a échoué. Réessayez, ou utilisez votre e-mail."));
            return;
          }
          const q = new URLSearchParams({ session: "1", suite: next ?? "" });
          if (referral) q.set("parrain", referral);
          // Navigation complète voulue : la route serveur lit les cookies de session et choisit la page suivante.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign(`/auth/confirm?${q}`);
        },
      });
      g.accounts.id.renderButton(box.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: Math.min(400, box.current.offsetWidth || 320), locale: lang });
      setReady(true);
    };
    if ((window as unknown as { google?: GoogleId }).google) void start();
    else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
      const s = existing ?? Object.assign(document.createElement("script"), { src: SCRIPT, async: true, defer: true });
      s.addEventListener("load", () => void start());
      if (!existing) document.head.appendChild(s);
    }
    return () => {
      cancelled = true;
    };
  }, [clientId, next, referral, lang, t]);

  return (
    <div>
      <div ref={box} className={ready ? "flex min-h-11 justify-center" : "hidden"} />
      {!ready && children}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
