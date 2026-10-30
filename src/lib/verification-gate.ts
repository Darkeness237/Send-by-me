import "server-only";

import { syncIdentityCheck } from "@/lib/identity-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Verification = { email: boolean; identity: boolean; ready: boolean };

/**
 * Minimum demandé avant de publier un trajet ou de réserver : e-mail confirmé et identité vérifiée.
 * `sync` interroge aussi Stripe si le badge n'est pas encore coché (pages uniquement, pas les actions).
 */
export async function verificationStatus(userId: string, { sync = false } = {}): Promise<Verification> {
  const [{ data: auth }, { data: profile }] = await Promise.all([
    (await createClient()).auth.getUser(),
    createAdminClient().from("profiles").select("id_verified").eq("id", userId).maybeSingle(),
  ]);
  const email = auth.user?.id === userId && Boolean(auth.user.email_confirmed_at);
  let identity = Boolean(profile?.id_verified);
  if (!identity && sync) identity = (await syncIdentityCheck(userId)) === "verified";
  return { email, identity, ready: email && identity };
}

const ERRORS = {
  "publier un trajet": ["Confirmez votre adresse e-mail avant de publier un trajet.", "Faites vérifier votre identité avant de publier un trajet (Mon profil)."],
  réserver: ["Confirmez votre adresse e-mail avant de réserver.", "Faites vérifier votre identité avant de réserver (Mon profil)."],
} as const;

export function verificationError(v: Verification, action: keyof typeof ERRORS) {
  return ERRORS[action][v.email ? 1 : 0];
}
