"use client";

// Erreur dans une page : message clair et bouton pour réessayer. Si l'erreur vient d'un fichier
// d'une ancienne version du site (mise en ligne pendant la visite), on recharge une fois tout seul.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

const STALE = /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed|Failed to find Server Action/i;

export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    if (STALE.test(`${error?.name} ${error?.message}`)) {
      try {
        if (!sessionStorage.getItem("sbm-reloaded")) {
          sessionStorage.setItem("sbm-reloaded", "1");
          window.location.reload();
          return;
        }
      } catch {}
    }
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Oups, la page n&apos;a pas pu s&apos;afficher.</h1>
        <p className="mt-2 text-muted">Réessayez : si le problème continue, rechargez la page.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={retry} className="rounded-full bg-brand-fill px-6 py-3 font-semibold text-white">
            Réessayer
          </button>
          <button type="button" onClick={() => window.location.reload()} className="rounded-full px-6 py-3 font-semibold ring-1 ring-line">
            Recharger
          </button>
        </div>
      </div>
    </main>
  );
}
