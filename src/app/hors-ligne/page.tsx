import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Hors ligne", robots: { index: false } };

// Page statique servie par le service worker quand la connexion manque.
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ink px-6 text-center text-white">
      <Logo tone="light" />
      <WifiOff className="mt-12 h-10 w-10 text-signal" aria-hidden="true" />
      <h1 className="display mt-5 text-3xl">Pas de connexion</h1>
      <p className="mt-3 max-w-sm text-white/70">
        Vérifiez votre réseau. Vos réservations et vos messages s&apos;afficheront dès que la connexion revient.
      </p>
      {/* Rechargement complet volontaire : la navigation client ne fonctionne pas hors ligne. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="mt-8 rounded-full bg-signal px-6 py-3 font-bold text-ink">
        Réessayer
      </a>
    </main>
  );
}
