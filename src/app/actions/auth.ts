"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured, SITE_URL } from "@/lib/env";
import { cleanReferralCode } from "@/lib/referral";
import { createClient } from "@/lib/supabase/server";
import { canSendAuthMail, resendWithOwnMail, signUpWithOwnMail } from "@/lib/auth-mail";

// unconfirmed : adresse inscrite mais pas encore confirmée (le formulaire propose de renvoyer le lien).
export type FormState = { error?: string; ok?: string; unconfirmed?: string } | null;

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
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error?.code === "email_not_confirmed")
    return {
      error: "Confirmez d'abord votre adresse e-mail pour vous connecter.",
      unconfirmed: parsed.data.email,
    };
  if (error) return { error: "E-mail ou mot de passe incorrect." };
  const next = safeNext(formData.get("suite"));
  // Premier passage : écran de bienvenue (photo, téléphone, identité).
  const { data: profile } = await supabase.from("profiles").select("onboarded_at").eq("id", data.user.id).maybeSingle();
  redirect(profile && !profile.onboarded_at ? `/bienvenue?suite=${encodeURIComponent(next)}` : next);
}

const signupSchema = credentials.extend({
  first_name: z.string().trim().min(2, "Indiquez votre prénom").max(40),
  last_name: z.string().trim().min(2, "Indiquez votre nom").max(60),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{8,20}$/, "Numéro de téléphone invalide (ex. +33 6 12 34 56 78)")
    .optional()
    .or(z.literal("")),
  country: z.string().trim().max(60).optional(),
  intent: z.enum(["send", "travel", "both"], { error: "Dites-nous ce que vous souhaitez faire" }),
  terms: z.literal("on", { error: "Acceptez les conditions d'utilisation pour continuer" }),
});

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: DEMO_ERROR };
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone: formData.get("phone") ?? "",
    country: formData.get("country") ?? undefined,
    intent: formData.get("intent"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Le pseudonyme public est « Prénom N. » ; le nom complet et le téléphone restent privés (member_contacts).
  const metadata = {
    display_name: `${parsed.data.first_name} ${parsed.data.last_name.charAt(0).toUpperCase()}.`,
    full_name: `${parsed.data.first_name} ${parsed.data.last_name}`,
    last_name: parsed.data.last_name,
    phone: parsed.data.phone || null,
    country: parsed.data.country || null,
    intent: parsed.data.intent,
    // Rattachement au parrain par un déclencheur en base (code vérifié côté serveur).
    referral_code: cleanReferralCode(formData.get("parrain")),
  };
  const next = safeNext(formData.get("suite"));

  // E-mail de confirmation envoyé par Send By Me (lien send-by-me.com, valable dans tout navigateur).
  if (canSendAuthMail()) {
    const result = await signUpWithOwnMail({ email: parsed.data.email, password: parsed.data.password, firstName: parsed.data.first_name, data: metadata, next });
    if (result === "exists") return { error: "Un compte existe déjà avec cette adresse. Connectez-vous, ou utilisez « Mot de passe oublié ? »." };
    if (result === "failed") return { error: "Inscription impossible pour le moment. Réessayez dans quelques minutes." };
    redirect(`/connexion?inscrit=1&suite=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: metadata, emailRedirectTo: `${SITE_URL}/auth/confirm` },
  });
  if (error) {
    return { error: error.code === "weak_password" ? "Mot de passe trop faible, choisissez-en un plus long." : "Inscription impossible avec cette adresse." };
  }
  // Adresse déjà inscrite et confirmée : Supabase ne crée rien et ne prévient pas, on le dit au membre.
  if (data.user && !data.user.identities?.length) {
    return { error: "Un compte existe déjà avec cette adresse. Connectez-vous, ou utilisez « Mot de passe oublié ? »." };
  }
  if (!data.session) redirect(`/connexion?inscrit=1&suite=${encodeURIComponent(next)}`);
  redirect(next);
}

/** Renvoie le lien de confirmation d'inscription. */
export async function resendConfirmation(_: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: DEMO_ERROR };
  const email = z.email().max(200).safeParse(formData.get("email"));
  if (!email.success) return { error: "Adresse e-mail invalide." };
  if (canSendAuthMail()) {
    // Réponse identique que l'adresse existe ou non : on ne révèle pas qui est inscrit.
    await resendWithOwnMail(email.data, safeNext(formData.get("suite")));
    return { ok: "Lien de confirmation renvoyé. Ouvrez-le depuis votre boîte mail (ou les courriers indésirables), puis connectez-vous." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: email.data, options: { emailRedirectTo: `${SITE_URL}/auth/confirm` } });
  if (error) return { error: error.status === 429 ? "Trop d'envois rapprochés. Réessayez dans quelques minutes." : "Envoi impossible pour le moment. Réessayez plus tard." };
  return { ok: "Lien de confirmation renvoyé. Ouvrez-le depuis votre boîte mail (ou les courriers indésirables), puis connectez-vous." };
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

/** Connexion ou inscription avec Google ou Facebook (OAuth, flux PKCE). Le retour passe par /auth/confirm. */
async function signInWithProvider(provider: "google" | "facebook", formData: FormData) {
  if (!isSupabaseConfigured) redirect("/connexion?erreur=demo");
  const next = safeNext(formData.get("suite"));
  const code = cleanReferralCode(formData.get("parrain"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${SITE_URL}/auth/confirm?suite=${encodeURIComponent(next)}${code ? `&parrain=${code}` : ""}`,
      ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : { scopes: "email public_profile" }),
    },
  });
  if (error || !data.url) redirect(`/connexion?erreur=${provider}`);
  redirect(data.url);
}

export async function signInWithGoogle(formData: FormData) {
  await signInWithProvider("google", formData);
}

export async function signInWithFacebook(formData: FormData) {
  await signInWithProvider("facebook", formData);
}
