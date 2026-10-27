import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

/** Client lié à la session de l'utilisateur : toutes les requêtes passent par la RLS. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : le proxy se charge de rafraîchir la session.
        }
      },
    },
  });
}

/** Identité vérifiée (signature JWT contrôlée), ou null. */
export async function getUserId(): Promise<string | null> {
  await connection(); // lecture de session : toujours au moment de la requête
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

/** Identité et rôle. Le rôle admin vient de app_metadata, modifiable uniquement côté serveur. */
export async function getSession(): Promise<{ userId: string | null; isAdmin: boolean }> {
  await connection();
  if (!isSupabaseConfigured) return { userId: null, isAdmin: false };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string; app_metadata?: { role?: string } } | undefined;
  return { userId: claims?.sub ?? null, isAdmin: claims?.app_metadata?.role === "admin" };
}
