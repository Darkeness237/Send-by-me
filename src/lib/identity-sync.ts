import "server-only";

import { notifySafe } from "@/lib/notify";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Filet de sécurité si le webhook Stripe n'arrive pas : on demande directement à Stripe
 * si une vérification d'identité du membre a réussi, et on coche le profil le cas échéant.
 * Renvoie l'état de la dernière session ("verified", "processing", …) ou null.
 */
export async function syncIdentityCheck(userId: string): Promise<string | null> {
  if (!isStripeConfigured) return null;
  try {
    const { data } = await stripe().identity.verificationSessions.list({ client_reference_id: userId, limit: 5 });
    if (data.some((s) => s.status === "verified")) {
      const { data: updated } = await createAdminClient().from("profiles").update({ id_verified: true }).eq("id", userId).eq("id_verified", false).select("id");
      if (updated?.length) {
        await notifySafe(userId, { kind: "verification_approved", title: "Identité vérifiée !", body: "Votre badge bleu est maintenant visible.", href: "/espace/profil", email: true });
      }
      return "verified";
    }
    return data[0]?.status ?? null;
  } catch (e) {
    const err = e as { type?: string; code?: string; message?: string };
    console.error("Synchronisation vérification d'identité", err.type, err.code, err.message);
    return null;
  }
}
