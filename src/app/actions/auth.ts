"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured, SITE_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string } | null;

const DEMO_ERROR = "Le site est en mode démo : connectez Supabase pour activer les comptes.";

/** N'accepte que des chemins internes, pour éviter les redirections ouvertes. */
function safeNext(raw: FormDataEntryValue | null) {
  const s = typeof raw === "string" ? raw : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/espace";
}

const credentials = z.object({
  email: z.email("Adresse e-mail invalide").max(200),
  password: z.string().min(8, "8 caractères minimum").max(72),
});

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: DEMO_ERROR };
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "E-mail ou mot de passe incorrect." };
  redirect(safeNext(formData.get("suite")));
}

const signupSchema = credentials.extend({
  full_name: z.string().trim().min(2, "Indiquez votre prénom et l'initiale de votre nom").max(80),
  terms: z.literal("on", { error: "Acceptez les conditions d'utilisation pour continuer" }),
});

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: DEMO_ERROR };
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${SITE_URL}/auth/confirm`,
    },
  });
  if (error) {
    return { error: error.code === "weak_password" ? "Mot de passe trop faible, choisissez-en un plus long." : "Inscription impossible avec cette adresse." };
  }
  if (!data.session) {
    const next = safeNext(formData.get("suite"));
    redirect(`/connexion?inscrit=1&suite=${encodeURIComponent(next)}`);
  }
  redirect(safeNext(formData.get("suite")));
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

/** Connexion ou inscription avec Google (OAuth, flux PKCE). Le retour passe par /auth/confirm. */
export async function signInWithGoogle(formData: FormData) {
  if (!isSupabaseConfigured) redirect("/connexion?erreur=demo");
  const next = safeNext(formData.get("suite"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${SITE_URL}/auth/confirm?suite=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/connexion?erreur=google");
  redirect(data.url);
}
