"use client";

// Dernier filet : erreur dans la mise en page racine. Elle remplace tout le document,
// d'où les styles en ligne (les styles globaux du site ne sont pas chargés ici).
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Fichier d'une ancienne version (mise en ligne pendant la visite) : un rechargement suffit.
    const e = error as { name?: string; message?: string } | null;
    if (/ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|Failed to find Server Action/i.test(`${e?.name} ${e?.message}`)) {
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
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#fbf8f1", color: "#0e304c", fontFamily: "system-ui, sans-serif" }}>
        <title>Send By Me · Une erreur est survenue</title>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Oups, une erreur est survenue.</h1>
          <p style={{ color: "#5f6f80", lineHeight: 1.5, margin: "0 0 24px" }}>Notre équipe est prévenue. Réessayez dans un instant.</p>
          <button
            type="button"
            onClick={retry}
            style={{ background: "#2f7a82", color: "#fff", border: 0, borderRadius: 999, padding: "12px 24px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
