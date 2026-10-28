"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured, SITE_URL } from "@/lib/env";
import { findPlace } from "@/lib/places";
import { createClient, getUserId } from "@/lib/supabase/server";
import { cleanIban, isValidIban, MOBILE_OPERATORS } from "@/lib/payout";
import { CONNECT_COUNTRIES, ensureConnectAccount, expressDashboardUrl, getConnectAccount, isConnectCountry, onboardingUrl } from "@/lib/stripe-connect";
import { isStripeConfigured } from "@/lib/stripe";
import { REPORT_REASONS } from "@/lib/types";
import type { FormState } from "./auth";

const DEMO_ERROR = "Mode démo : connectez Supabase pour activer cette fonction.";

// ── Profil ──────────────────────────────────────────────────────
const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Indiquez au moins 2 caractères").max(80),
  city: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(600, "600 caractères maximum").optional(),
});

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // RLS + droits par colonne : seuls nom, ville et présentation sont modifiables.
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, city: parsed.data.city || null, bio: parsed.data.bio || null })
    .eq("id", userId);
  if (error) return { error: "Profil non enregistré." };
  revalidatePath("/espace");
  return { ok: "Profil enregistré." };
}

// ── Mot de passe oublié ─────────────────────────────────────────
export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: DEMO_ERROR };
  const email = z.email().max(200).safeParse(formData.get("email"));
  if (!email.success) return { error: "Adresse e-mail invalide." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${SITE_URL}/auth/confirm?suite=/nouveau-mot-de-passe`,
  });
  // Même réponse que l'adresse existe ou non, pour ne pas révéler les comptes.
  return { ok: "Si un compte existe avec cette adresse, vous allez recevoir un lien pour choisir un nouveau mot de passe." };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Ce lien a expiré. Recommencez depuis « Mot de passe oublié »." };
  const password = String(formData.get("password") ?? "");
  if (password.length < 8 || password.length > 72) return { error: "8 caractères minimum." };
  if (password !== formData.get("confirm")) return { error: "Les deux mots de passe ne correspondent pas." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.code === "same_password" ? "Choisissez un mot de passe différent de l'ancien." : "Mot de passe non modifié." };
  redirect("/espace");
}

// ── Signalement ─────────────────────────────────────────────────
const reasonIds = REPORT_REASONS.map((r) => r.id) as [string, ...string[]];
const reportSchema = z.object({
  booking_id: z.uuid(),
  reason: z.enum(reasonIds, { error: "Choisissez un motif" }),
  details: z.string().trim().min(10, "Décrivez le problème en quelques phrases").max(2000),
});

export async function createReport(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // RLS : seul un participant de la réservation peut signaler, et en son nom.
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({ ...parsed.data, author_id: userId });
  if (error) return { error: "Signalement non envoyé." };
  revalidatePath(`/reservations/${parsed.data.booking_id}`);
  return { ok: "Signalement envoyé. L'équipe vous répond par e-mail." };
}

// ── Alertes de ligne ────────────────────────────────────────────
export async function createAlert(from: string, to: string) {
  const userId = await getUserId();
  if (!userId) redirect(`/connexion?suite=${encodeURIComponent(`/recherche?from=${from}&to=${to}`)}`);
  const f = findPlace(from)?.city ?? from.trim().slice(0, 80);
  const t = findPlace(to)?.city ?? to.trim().slice(0, 80);
  if (f.length < 2 || t.length < 2) return;
  const supabase = await createClient();
  await supabase.from("route_alerts").upsert({ user_id: userId, from_city: f, to_city: t }, { onConflict: "user_id,from_city,to_city", ignoreDuplicates: true });
  revalidatePath("/recherche");
  revalidatePath("/espace");
}

export async function deleteAlert(id: number) {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = await createClient();
  await supabase.from("route_alerts").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/espace");
}

// ── Moyen de versement ──────────────────────────────────────────
const payoutSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("iban"),
    holder_name: z.string().trim().min(2, "Indiquez le titulaire du compte").max(100),
    iban: z
      .string()
      .transform(cleanIban)
      .refine(isValidIban, "IBAN invalide : vérifiez les caractères saisis."),
    bic: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^([A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?)?$/, "BIC invalide (8 ou 11 caractères).")
      .optional(),
  }),
  z.object({
    kind: z.literal("mobile_money"),
    holder_name: z.string().trim().min(2, "Indiquez le nom du titulaire").max(100),
    mobile_operator: z.enum(MOBILE_OPERATORS.map((o) => o.id) as [string, ...string[]], { error: "Choisissez l'opérateur" }),
    mobile_number: z
      .string()
      .transform((v) => v.replace(/[\s.-]/g, ""))
      .refine((v) => /^\+[0-9]{8,15}$/.test(v), "Numéro au format international, par exemple +237 6 12 34 56 78."),
    country: z.string().trim().max(60).optional(),
  }),
]);

export async function savePayoutMethod(_: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: DEMO_ERROR };
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  const parsed = payoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const row =
    d.kind === "iban"
      ? { kind: d.kind, holder_name: d.holder_name, iban: d.iban, bic: d.bic || null, mobile_operator: null, mobile_number: null, country: d.iban.slice(0, 2) }
      : { kind: d.kind, holder_name: d.holder_name, iban: null, bic: null, mobile_operator: d.mobile_operator, mobile_number: d.mobile_number, country: d.country || null };
  const supabase = await createClient();
  const { error } = await supabase.from("payout_methods").upsert({ user_id: userId, ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "Moyen de versement non enregistré. Réessayez." };
  revalidatePath("/espace/profil");

  // IBAN d'un pays couvert par Stripe : virements automatiques. Le compte Stripe est créé prérempli,
  // puis le voyageur est envoyé chez Stripe pour confirmer son identité (si ce n'est pas déjà fait).
  const country = row.country ?? "";
  if (d.kind === "iban" && isStripeConfigured && isConnectCountry(country)) {
    let url: string | null = null;
    try {
      const [{ data: user }, existing] = await Promise.all([supabase.auth.getUser(), getConnectAccount(userId)]);
      const accountId = await ensureConnectAccount(userId, country, user.user?.email ?? null, d.holder_name, { iban: d.iban, holder: d.holder_name });
      if (!existing?.transfers_active) url = await onboardingUrl(accountId);
      else return { ok: "IBAN mis à jour. Vos prochains virements automatiques y seront envoyés." };
    } catch (e) {
      console.error("Virements automatiques à l'enregistrement de l'IBAN", e instanceof Error ? e.message : e);
      return { ok: "IBAN enregistré. Vos gains seront versés sur ce compte." };
    }
    redirect(url);
  }
  return { ok: "Moyen de versement enregistré. Vos prochains gains y seront versés." };
}

export async function deletePayoutMethod() {
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil/versement");
  const supabase = await createClient();
  await supabase.from("payout_methods").delete().eq("user_id", userId);
  revalidatePath("/espace/profil");
  redirect("/espace/profil/versement");
}

// ── Virements automatiques (Stripe Connect) ─────────────────────
/** Crée le compte Stripe du voyageur si besoin, puis l'envoie sur le formulaire Stripe (identité, IBAN). */
export async function startStripeOnboarding(formData: FormData) {
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil/versement");
  const country = String(formData.get("country") ?? "FR");
  if (!CONNECT_COUNTRIES.some(([c]) => c === country)) redirect("/espace/profil/versement?stripe=pays");
  const supabase = await createClient();
  const [{ data: user }, { data: profile }] = await Promise.all([supabase.auth.getUser(), supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle()]);
  let url: string;
  try {
    const accountId = await ensureConnectAccount(userId, country, user.user?.email ?? null, profile?.full_name ?? "");
    url = await onboardingUrl(accountId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Inscription Stripe du voyageur", message);
    // Connect pas encore activé sur le compte Stripe de Send By Me : rien que le voyageur puisse faire.
    redirect(`/espace/profil/versement?stripe=${/connect/i.test(message) && /sign(ed)? up|enable|activate|platform/i.test(message) ? "indisponible" : "erreur"}`);
  }
  redirect(url);
}

/** Tableau de bord Stripe Express du voyageur : virements, IBAN. */
export async function openStripeDashboard() {
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil/versement");
  const acc = await getConnectAccount(userId);
  if (!acc) redirect("/espace/profil/versement");
  let url: string;
  try {
    url = await expressDashboardUrl(acc.account_id);
  } catch {
    redirect("/espace/profil/versement?stripe=erreur");
  }
  redirect(url);
}
