import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// Hors des actions serveur : appelé uniquement par l'administration (après contrôle du rôle) et par le webhook du partenaire.

/** Issue de la livraison à domicile. « Livré » passe l'envoi en livré, ce qui déclenche le versement au voyageur. */
export async function applyDeliveryOutcome(bookingId: string, outcome: "delivered" | "failed", note?: string) {
  if (!z.uuid().safeParse(bookingId).success) return false;
  const db = createAdminClient();
  const { data: b } = await db.from("bookings").select("id, status, delivery_cents").eq("id", bookingId).maybeSingle();
  if (!b || !b.delivery_cents || b.status !== "picked_up") return false;
  const now = new Date().toISOString();
  if (outcome === "delivered") {
    await db
      .from("bookings")
      .update({ status: "delivered", delivery_status: "delivered", delivered_at: now, updated_at: now })
      .eq("id", bookingId)
      .eq("status", "picked_up");
  } else {
    await db.from("bookings").update({ delivery_status: "failed", updated_at: now }).eq("id", bookingId);
    await db.from("booking_events").insert({ booking_id: bookingId, kind: "delivery_failed", note: note?.slice(0, 300) ?? null });
  }
  revalidatePath(`/reservations/${bookingId}`);
  return true;
}
