"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/supabase/server";
import type { FormState } from "./auth";

/** Chaque action admin revérifie le rôle côté serveur. */
async function requireAdmin() {
  const { userId, isAdmin } = await getSession();
  if (!userId || !isAdmin) notFound();
  return userId;
}

const uuid = z.uuid();

export async function setVerified(profileId: string, verified: boolean) {
  await requireAdmin();
  if (!uuid.safeParse(profileId).success) return;
  await createAdminClient().from("profiles").update({ id_verified: verified }).eq("id", profileId);
  revalidatePath("/admin");
}

export async function resolveReport(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(formData.get("report_id"));
  const resolution = String(formData.get("resolution") ?? "").trim();
  if (!Number.isInteger(id) || resolution.length < 3) return { error: "Indiquez la décision prise." };
  await createAdminClient()
    .from("reports")
    .update({ status: "resolved", resolution: resolution.slice(0, 2000), resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "open");
  revalidatePath("/admin");
  return { ok: "Signalement clos." };
}

export async function markPayoutPaid(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const bookingId = String(formData.get("booking_id") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  if (!uuid.safeParse(bookingId).success) return { error: "Réservation invalide." };
  if (reference.length < 3) return { error: "Indiquez la référence du virement." };
  const { data } = await createAdminClient()
    .from("bookings")
    .update({ payout_status: "paid", payout_reference: reference.slice(0, 120), paid_out_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("payout_status", "due")
    .select("id");
  revalidatePath("/admin");
  return data?.length ? { ok: "Versement enregistré." } : { error: "Ce versement n'est plus en attente." };
}

/** Rembourse l'expéditeur sur Stripe, puis libère les kilos du trajet. */
export async function refundBooking(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!uuid.safeParse(bookingId).success) return { error: "Réservation invalide." };

  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select("id, status, stripe_payment_intent_id").eq("id", bookingId).maybeSingle();
  if (!b || !["paid", "picked_up"].includes(b.status)) return { error: "Seule une réservation payée et non livrée peut être remboursée." };

  if (b.stripe_payment_intent_id) {
    if (!isStripeConfigured) return { error: "Stripe n'est pas configuré." };
    try {
      await stripe().refunds.create(
        { payment_intent: b.stripe_payment_intent_id, metadata: { booking_id: b.id } },
        { idempotencyKey: `refund-${b.id}` },
      );
    } catch {
      return { error: "Stripe a refusé le remboursement. Vérifiez le paiement dans le Dashboard." };
    }
  }

  const { data: ok } = await admin.rpc("refund_booking", { p_booking_id: b.id });
  revalidatePath("/admin");
  revalidatePath(`/reservations/${b.id}`);
  return ok ? { ok: "Remboursement effectué." } : { error: "Remboursé sur Stripe, mais la réservation n'a pas pu être mise à jour : vérifiez-la." };
}

// ── Vérification des documents ──────────────────────────────────
const VERIF_BUCKET = "verification-documents";

/** Valide ou refuse une pièce d'identité, puis supprime les fichiers (on ne garde que la décision). */
export async function reviewIdentity(_: FormState, formData: FormData): Promise<FormState> {
  const adminId = await requireAdmin();
  const id = Number(formData.get("verification_id"));
  const decision = formData.get("decision");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!Number.isInteger(id) || (decision !== "approved" && decision !== "rejected")) return { error: "Décision invalide." };
  if (decision === "rejected" && reason.length < 3) return { error: "Indiquez au membre pourquoi la pièce est refusée." };

  const db = createAdminClient();
  const { data: v } = await db
    .from("identity_verifications")
    .select("id, user_id, front_path, back_path, selfie_path")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();
  if (!v) return { error: "Cette demande a déjà été traitée." };

  if (decision === "approved") {
    await db.from("profiles").update({ id_verified: true }).eq("id", v.user_id);
  }
  await db
    .from("identity_verifications")
    .update({
      status: decision,
      rejection_reason: decision === "rejected" ? reason : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      front_path: null,
      back_path: null,
      selfie_path: null,
    })
    .eq("id", id);
  const files = [v.front_path, v.back_path, v.selfie_path].filter(Boolean) as string[];
  if (files.length) await db.storage.from(VERIF_BUCKET).remove(files);
  revalidatePath("/admin");
  return { ok: decision === "approved" ? "Identité vérifiée. Documents supprimés." : "Demande refusée. Documents supprimés." };
}

export async function reviewTripProof(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const tripId = String(formData.get("trip_id") ?? "");
  const decision = formData.get("decision");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!uuid.safeParse(tripId).success || (decision !== "approved" && decision !== "rejected")) return { error: "Décision invalide." };
  if (decision === "rejected" && reason.length < 3) return { error: "Indiquez au voyageur pourquoi le justificatif est refusé." };

  const db = createAdminClient();
  const { data: proof } = await db.from("trip_proofs").select("file_path").eq("trip_id", tripId).eq("status", "pending").maybeSingle();
  if (!proof) return { error: "Ce justificatif a déjà été traité." };
  if (decision === "approved") await db.from("trips").update({ ticket_verified: true }).eq("id", tripId);
  await db
    .from("trip_proofs")
    .update({ status: decision, rejection_reason: decision === "rejected" ? reason : null, reviewed_at: new Date().toISOString(), file_path: null })
    .eq("trip_id", tripId);
  if (proof.file_path) await db.storage.from(VERIF_BUCKET).remove([proof.file_path]);
  revalidatePath("/admin");
  return { ok: decision === "approved" ? "Trajet vérifié. Justificatif supprimé." : "Justificatif refusé et supprimé." };
}
