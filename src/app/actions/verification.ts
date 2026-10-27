"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import type { FormState } from "./auth";

const BUCKET = "verification-documents";
const DOC_TYPES = ["cni", "passport", "residence_permit", "driving_license"] as const;

/** Un chemin n'est accepté que s'il est dans le dossier du membre et au format attendu. */
function ownPath(userId: string, path: unknown) {
  if (typeof path !== "string" || !path) return null;
  const re = new RegExp(`^${userId}/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp|heic|pdf)$`);
  return re.test(path) ? path : null;
}

/** Vérifie que les fichiers ont bien été déposés (et ne sont pas inventés). */
async function filesExist(userId: string, paths: string[]) {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(BUCKET).list(userId, { limit: 1000 });
  const names = new Set((data ?? []).map((f) => `${userId}/${f.name}`));
  return paths.every((p) => names.has(p));
}

const identitySchema = z.object({ document_type: z.enum(DOC_TYPES, { error: "Choisissez le type de pièce" }) });

export async function submitIdentityVerification(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  const parsed = identitySchema.safeParse({ document_type: formData.get("document_type") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const front = ownPath(userId, formData.get("front_path"));
  const back = ownPath(userId, formData.get("back_path"));
  const selfie = ownPath(userId, formData.get("selfie_path"));
  if (!front) return { error: "Ajoutez la photo du recto de votre pièce." };
  if (!selfie) return { error: "Ajoutez un selfie en tenant votre pièce." };
  if (parsed.data.document_type !== "passport" && !back) return { error: "Ajoutez la photo du verso de votre pièce." };

  const paths = [front, selfie, ...(back ? [back] : [])];
  if (!(await filesExist(userId, paths))) return { error: "Un fichier est introuvable. Déposez-le à nouveau." };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id_verified").eq("id", userId).single();
  if (profile?.id_verified) return { ok: "Votre identité est déjà vérifiée." };

  const { error } = await admin.from("identity_verifications").insert({
    user_id: userId,
    document_type: parsed.data.document_type,
    front_path: front,
    back_path: back,
    selfie_path: selfie,
  });
  if (error) {
    return { error: error.code === "23505" ? "Une demande est déjà en cours d'examen." : "Demande non enregistrée. Réessayez." };
  }
  revalidatePath("/espace/profil");
  return { ok: "Merci ! Votre demande est en cours d'examen. Vous verrez le résultat ici." };
}

export async function submitTripProof(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  const tripId = String(formData.get("trip_id") ?? "");
  if (!z.uuid().safeParse(tripId).success) return { error: "Trajet invalide." };
  const file = ownPath(userId, formData.get("file_path"));
  if (!file) return { error: "Ajoutez votre billet ou votre carte d'embarquement." };
  if (!(await filesExist(userId, [file]))) return { error: "Fichier introuvable. Déposez-le à nouveau." };

  const admin = createAdminClient();
  const { data: trip } = await admin.from("trips").select("traveler_id, ticket_verified").eq("id", tripId).maybeSingle();
  if (!trip || trip.traveler_id !== userId) return { error: "Ce trajet ne vous appartient pas." };
  if (trip.ticket_verified) return { ok: "Ce trajet est déjà vérifié." };

  const { data: existing } = await admin.from("trip_proofs").select("status, file_path").eq("trip_id", tripId).maybeSingle();
  if (existing?.status === "pending" && existing.file_path) {
    await admin.storage.from(BUCKET).remove([existing.file_path]);
  }
  const { error } = await admin.from("trip_proofs").upsert({
    trip_id: tripId,
    traveler_id: userId,
    file_path: file,
    status: "pending",
    rejection_reason: null,
    created_at: new Date().toISOString(),
    reviewed_at: null,
  });
  if (error) return { error: "Justificatif non enregistré. Réessayez." };
  revalidatePath(`/trajets/${tripId}`);
  return { ok: "Justificatif envoyé. Le badge « Trajet vérifié » apparaîtra après contrôle." };
}
