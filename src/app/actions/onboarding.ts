"use server";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSmsConfigured, sendSms } from "@/lib/brevo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";
import type { FormState } from "./auth";

const CODE_TTL_MS = 10 * 60_000;
const MAX_SENDS = 5;
const MAX_ATTEMPTS = 5;

const hash = (userId: string, code: string) => createHash("sha256").update(`${userId}:${code}`).digest("hex");

/** « 06 12 34 56 78 » + indicatif → « +33612345678 ». */
function toE164(raw: string, dial: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  return `${dial}${digits.replace(/^0/, "")}`;
}

export async function sendPhoneCode(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  if (!isSmsConfigured()) return { error: "La vérification par SMS n'est pas encore activée. Réessayez un peu plus tard." };
  const phone = toE164(String(formData.get("phone") ?? ""), String(formData.get("dial") ?? "+33"));
  if (!/^\+[0-9]{8,15}$/.test(phone)) return { error: "Numéro invalide. Exemple : 6 12 34 56 78." };

  const db = createAdminClient();
  const { data: prev } = await db.from("phone_verifications").select("sent_count, created_at").eq("user_id", userId).maybeSingle();
  const recent = prev && Date.now() - new Date(prev.created_at).getTime() < 24 * 3600_000;
  if (recent && prev.sent_count >= MAX_SENDS) return { error: "Trop de codes envoyés aujourd'hui. Réessayez demain." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.from("phone_verifications").upsert({
    user_id: userId,
    phone,
    code_hash: hash(userId, code),
    attempts: 0,
    sent_count: recent ? prev.sent_count + 1 : 1,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    created_at: recent ? prev.created_at : new Date().toISOString(),
  });
  const sent = await sendSms(phone, `Send By Me : votre code de vérification est ${code}. Il expire dans 10 minutes.`);
  if (!sent) return { error: "Le SMS n'a pas pu être envoyé. Vérifiez le numéro et réessayez." };
  return { ok: `Code envoyé au ${phone}.` };
}

export async function verifyPhoneCode(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "Le code fait 6 chiffres." };

  const db = createAdminClient();
  const { data: v } = await db.from("phone_verifications").select("phone, code_hash, attempts, expires_at").eq("user_id", userId).maybeSingle();
  if (!v || new Date(v.expires_at).getTime() < Date.now()) return { error: "Code expiré. Demandez-en un nouveau." };
  if (v.attempts >= MAX_ATTEMPTS) return { error: "Trop d'essais. Demandez un nouveau code." };

  const ok = timingSafeEqual(Buffer.from(hash(userId, code)), Buffer.from(v.code_hash));
  if (!ok) {
    await db.from("phone_verifications").update({ attempts: v.attempts + 1 }).eq("user_id", userId);
    return { error: "Code incorrect." };
  }
  await db.from("member_contacts").upsert({ user_id: userId, phone: v.phone, phone_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  await db.from("phone_verifications").delete().eq("user_id", userId);
  revalidatePath("/bienvenue");
  revalidatePath("/espace/profil");
  return { ok: "Numéro vérifié." };
}

/** Photo de profil déposée dans le dossier du membre (bucket public « avatars »). */
export async function saveAvatar(path: string) {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  if (!new RegExp(`^${userId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(path)) return { error: "Photo invalide." };
  const supabase = await createClient();
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", userId);
  if (error) return { error: "Photo non enregistrée." };
  revalidatePath("/bienvenue");
  revalidatePath("/espace/profil");
  return { ok: true };
}

const finishSchema = z.object({ intent: z.enum(["send", "travel", "both"]).optional(), suite: z.string().optional() });

export async function finishOnboarding(formData: FormData) {
  const userId = await getUserId();
  if (!userId) redirect("/connexion");
  const d = finishSchema.parse({ intent: formData.get("intent") ?? undefined, suite: formData.get("suite") ?? undefined });
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString(), ...(d.intent ? { intent: d.intent } : {}) })
    .eq("id", userId);
  const next = d.suite && d.suite.startsWith("/") && !d.suite.startsWith("//") ? d.suite : "/espace";
  redirect(next);
}
