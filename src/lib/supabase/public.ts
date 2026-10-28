import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Client anonyme, sans cookies : lit seulement ce que la RLS ouvre à tous (trajets publiés, notes).
 * Utilisable dans les fonctions "use cache", partagées entre tous les visiteurs.
 */
export function createPublicClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
