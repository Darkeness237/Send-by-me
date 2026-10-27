"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { SITE_URL } from "@/lib/env";
import { isStripeConfigured, stripe } from "@/lib/stripe";
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
    kind: "identity",
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

// ── Adresse (deuxième étape du compte certifié) ─────────────────
const addressSchema = z.object({
  phone: z.string().trim().regex(/^\+?[0-9 ]{8,20}$/, "Numéro de téléphone invalide (ex. +33 6 12 34 56 78)"),
  address_line: z.string().trim().min(5, "Indiquez votre adresse").max(200),
  postal_code: z.string().trim().max(20).optional(),
  address_city: z.string().trim().min(2, "Indiquez votre ville").max(80),
  country: z.string().trim().min(2, "Indiquez votre pays").max(60),
});

export async function submitAddressVerification(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const proof = ownPath(userId, formData.get("proof_path"));
  if (!proof) return { error: "Ajoutez un justificatif de domicile de moins de 3 mois." };
  if (!(await filesExist(userId, [proof]))) return { error: "Fichier introuvable. Déposez-le à nouveau." };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("address_verified").eq("id", userId).single();
  if (profile?.address_verified) return { ok: "Votre adresse est déjà vérifiée." };

  await admin
    .from("member_contacts")
    .upsert({ user_id: userId, ...parsed.data, postal_code: parsed.data.postal_code || null, updated_at: new Date().toISOString() });
  const { error } = await admin.from("identity_verifications").insert({
    user_id: userId,
    kind: "address",
    document_type: "proof_of_address",
    front_path: proof,
  });
  if (error) {
    return { error: error.code === "23505" ? "Un justificatif est déjà en cours d'examen." : "Demande non enregistrée. Réessayez." };
  }
  revalidatePath("/espace/profil");
  return { ok: "Merci ! Votre justificatif de domicile est en cours d'examen." };
}

// ── KYC automatique avec Stripe Identity (si Stripe est configuré) ──
export async function startIdentityCheck() {
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil");
  if (!isStripeConfigured) redirect("/espace/profil?kyc=indisponible");

  const session = await stripe().identity.verificationSessions.create(
    {
      type: "document",
      options: {
        document: {
          allowed_types: ["id_card", "passport", "driving_license"],
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      client_reference_id: userId,
      metadata: { user_id: userId },
      return_url: `${SITE_URL}/espace/profil?kyc=retour`,
    },
    { idempotencyKey: `kyc-${userId}-${Math.floor(Date.now() / 600_000)}` },
  );
  if (!session.url) redirect("/espace/profil?kyc=erreur");
  redirect(session.url);
}
