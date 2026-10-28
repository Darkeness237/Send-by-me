"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { notifySafe } from "@/lib/notify";
import { notifyBooking } from "@/lib/notify-events";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/supabase/server";
import type { FormState } from "./auth";
import { payTraveler } from "@/lib/stripe-connect";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/finance";

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
    .select("id, trip_id");
  // La mise en avant payante du trajet est retenue sur ce premier versement.
  if (data?.length) {
    await createAdminClient()
      .from("trips")
      .update({ boost_settled_booking: bookingId })
      .eq("id", data[0].trip_id as string)
      .gt("boost_fee_cents", 0)
      .is("boost_settled_booking", null);
  }
  revalidatePath("/admin");
  return data?.length ? { ok: "Versement enregistré." } : { error: "Ce versement n'est plus en attente." };
}

/** Marque versées toutes les primes ambassadeur en attente d'un voyageur. */
export async function markRewardsPaid(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const travelerId = String(formData.get("traveler_id") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  if (!uuid.safeParse(travelerId).success) return { error: "Membre invalide." };
  if (reference.length < 3) return { error: "Indiquez la référence du virement." };
  const { data } = await createAdminClient()
    .from("ambassador_rewards")
    .update({ paid_at: new Date().toISOString(), payout_reference: reference.slice(0, 120) })
    .eq("traveler_id", travelerId)
    .is("paid_at", null)
    .select("id");
  revalidatePath("/admin");
  return data?.length ? { ok: "Primes enregistrées comme versées." } : { error: "Aucune prime en attente." };
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
  if (ok) await notifyBooking(b.id, "refunded");
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
    .select("id, user_id, kind, front_path, back_path, selfie_path")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();
  if (!v) return { error: "Cette demande a déjà été traitée." };

  if (decision === "approved") {
    await db
      .from("profiles")
      .update(v.kind === "address" ? { address_verified: true } : { id_verified: true })
      .eq("id", v.user_id);
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
  const what = v.kind === "address" ? "Adresse vérifiée" : "Identité vérifiée";
  await notifySafe(v.user_id, {
    kind: `verification_${decision}`,
    title: decision === "approved" ? `${what} !` : "Vérification refusée",
    body: decision === "approved" ? "Votre badge est maintenant visible par les autres membres." : `Motif : ${reason}. Vous pouvez envoyer de nouveaux documents.`,
    href: "/espace/profil",
    email: true,
  });
  return { ok: decision === "approved" ? `${what}. Documents supprimés.` : "Demande refusée. Documents supprimés." };
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

/** Relance le virement automatique Stripe d'une réservation livrée (compte du voyageur actif). */
export async function payoutViaStripe(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!uuid.safeParse(bookingId).success) return { error: "Réservation invalide." };
  const transferId = await payTraveler(bookingId);
  revalidatePath("/admin");
  return transferId ? { ok: `Virement Stripe envoyé (${transferId}).` } : { error: "Virement impossible : compte Stripe du voyageur inactif ou erreur Stripe (voir les journaux)." };
}

// ── Frais annexes ───────────────────────────────────────────────
const expenseSchema = z.object({
  spent_on: z.iso.date({ error: "Date invalide." }),
  category: z.enum(EXPENSE_CATEGORIES.map(([k]) => k) as [ExpenseCategory, ...ExpenseCategory[]], { error: "Choisissez une catégorie." }),
  label: z.string().trim().min(2, "Décrivez la dépense (2 caractères minimum).").max(140),
  amount: z
    .string()
    .trim()
    .transform((v) => Math.round(Number(v.replace(/\s/g, "").replace(",", ".")) * 100))
    .refine((c) => Number.isFinite(c) && c >= 1 && c <= 10_000_000, "Montant invalide."),
  tracking_code: z.string().trim().toUpperCase().max(40).optional(),
});

export async function addExpense(_: FormState, formData: FormData): Promise<FormState> {
  const adminId = await requireAdmin();
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const db = createAdminClient();
  let bookingId: string | null = null;
  if (d.tracking_code) {
    const { data: b } = await db.from("bookings").select("id").eq("tracking_code", d.tracking_code).maybeSingle();
    if (!b) return { error: "Aucune réservation avec ce numéro de suivi." };
    bookingId = b.id as string;
  }
  const { error } = await db.from("admin_expenses").insert({ spent_on: d.spent_on, category: d.category, label: d.label, amount_cents: d.amount, booking_id: bookingId, created_by: adminId });
  if (error) return { error: "Dépense non enregistrée. Réessayez." };
  revalidatePath("/admin");
  return { ok: "Dépense enregistrée." };
}

export async function deleteExpense(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("expense_id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await createAdminClient().from("admin_expenses").delete().eq("id", id);
  revalidatePath("/admin");
}
