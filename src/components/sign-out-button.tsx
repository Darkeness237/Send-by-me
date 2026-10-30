"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { useT } from "@/i18n/client";
import { createClient } from "@/lib/supabase/client";

/**
 * Déconnexion depuis le navigateur : la session est fermée directement auprès de Supabase,
 * sans attendre un aller-retour par le serveur du site. En cas d'échec, on repasse par le serveur.
 */
export function SignOutButton({ className }: { className: string }) {
  const t = useT();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={async () => {
        setPending(true);
        const { error } = await createClient().auth.signOut();
        if (error) return signOut();
        // Navigation complète voulue : aucune page de l'espace membre ne reste en mémoire.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/");
      }}
    >
      <LogOut className="h-5 w-5" aria-hidden="true" /> {pending ? t("Déconnexion…") : t("Se déconnecter")}
    </button>
  );
}
