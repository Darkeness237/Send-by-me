"use client";

import { Download, Share, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "sbm-install-dismissed";

/** Enregistre le service worker et propose l'installation (Android/desktop) ou explique la marche à suivre (iOS). */
export function PwaInstall() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    if (standalone || dismissed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    const timer = isIos ? window.setTimeout(() => { setIos(true); setHidden(false); }, 4000) : undefined;

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
    setHidden(true);
  }

  if (hidden) return null;
  return (
    <div role="dialog" aria-label="Installer l'application" className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink p-4 text-white shadow-2xl ring-1 ring-white/10 sm:bottom-5">
      <Image src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold">Installer Send By Me</p>
        {ios ? (
          <p className="text-white/70">
            Touchez <Share className="inline h-4 w-4 align-text-bottom" aria-label="Partager" /> puis « Sur l&apos;écran d&apos;accueil ».
          </p>
        ) : (
          <p className="text-white/70">Accès direct depuis votre écran d&apos;accueil, appels compris.</p>
        )}
      </div>
      {!ios && (
        <button type="button" onClick={install} className="flex items-center gap-1.5 rounded-full bg-signal px-4 py-2 text-sm font-bold text-ink">
          <Download className="h-4 w-4" aria-hidden="true" /> Installer
        </button>
      )}
      <button type="button" onClick={dismiss} className="rounded-full p-1.5 text-white/60 hover:bg-white/10" aria-label="Fermer">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
