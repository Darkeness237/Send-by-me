"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured, SITE_URL } from "@/lib/env";
import { findPlace } from "@/lib/places";
import { createClient, getUserId } from "@/lib/supabase/server";
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
  return { ok: "Signalement envoyé. L'équipe vous répond par e-mail, et le paiement reste bloqué pendant l'examen." };
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
