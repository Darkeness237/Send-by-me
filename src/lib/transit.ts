import "server-only";

import { notifyBooking } from "@/lib/notify-events";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fait avancer le suivi d'après les horaires du vol : « En transit » au décollage, « Arrivé » à l'heure
 * d'arrivée prévue. Idempotent (chaque étape n'est enregistrée qu'une fois) : appelé à l'ouverture
 * d'une réservation ou du suivi, et toutes les 15 minutes par une tâche planifiée.
 */
export async function advanceTransit(bookingId?: string) {
  const { data } = await createAdminClient().rpc("advance_transit", bookingId ? { p_booking_id: bookingId } : {});
  const steps = (data ?? []) as { booking_id: string; kind: "departed" | "arrived" }[];
  await Promise.all(steps.map((s) => notifyBooking(s.booking_id, s.kind)));
  return steps.length;
}
