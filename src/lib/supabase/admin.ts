import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Client avec la clé secrète : contourne la RLS.
 * À n'utiliser que dans les actions serveur, APRÈS avoir vérifié l'identité et les droits.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !key) throw new Error("SUPABASE_SECRET_KEY manquante");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
