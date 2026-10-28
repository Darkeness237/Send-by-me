"use client";

import { useT } from "@/i18n/client";

/** Message renvoyé par une action serveur (en français) : traduit à l'affichage. */
export function FormMessage({ state }: { state?: { error?: string; ok?: string } | null }) {
  const t = useT();
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="rounded-xl bg-danger-pale px-4 py-3 text-sm text-danger">
        {t(state.error)}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="rounded-xl bg-ok-pale px-4 py-3 text-sm text-ok">
        {t(state.ok)}
      </p>
    );
  return null;
}
