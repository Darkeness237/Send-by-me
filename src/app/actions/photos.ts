"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_PHOTOS_PER_STEP, PHOTO_STEPS, type PhotoKind } from "@/lib/parcel-photos";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/types";

const uuid = z.uuid();

/**
 * Enregistre une photo déposée dans le stockage privé de la réservation. Le serveur vérifie que
 * l'auteur a le bon rôle (expéditeur ou voyageur) et que l'étape correspond au statut de l'envoi.
 */
export async function addBookingPhoto(bookingId: string, kind: PhotoKind, path: string) {
  const userId = await getUserId();
  if (!userId || !uuid.safeParse(bookingId).success) return { error: "Action non autorisée." };
  const step = PHOTO_STEPS.find((s) => s.kind === kind);
  if (!step) return { error: "Étape inconnue." };
  if (!new RegExp(`^${bookingId}/${kind}-[0-9a-f-]{36}\\.(jpg|jpeg|png|webp|heic)$`).test(path)) return { error: "Fichier invalide." };

  const db = createAdminClient();
  const { data: b } = await db.from("bookings").select("id, status, sender_id, trip:trips(traveler_id)").eq("id", bookingId).maybeSingle();
  const trip = Array.isArray(b?.trip) ? b.trip[0] : b?.trip;
  if (!b) return { error: "Réservation introuvable." };
  const role = b.sender_id === userId ? "sender" : trip?.traveler_id === userId ? "traveler" : null;
  if (role !== step.by) return { error: "Cette photo doit être ajoutée par l'autre participant." };
  if (!step.when.includes(b.status as BookingStatus)) return { error: "Cette étape n'est pas encore ouverte (ou est déjà passée)." };

  const { count } = await db.from("booking_photos").select("id", { count: "exact", head: true }).eq("booking_id", bookingId).eq("kind", kind);
  if ((count ?? 0) >= MAX_PHOTOS_PER_STEP) return { error: `${MAX_PHOTOS_PER_STEP} photos maximum pour cette étape.` };

  // Le fichier doit vraiment exister dans le stockage.
  const folder = path.split("/")[0];
  const { data: files } = await db.storage.from("parcel-photos").list(folder, { search: path.split("/")[1] });
  if (!files?.length) return { error: "Photo introuvable : réessayez l'envoi." };

  const { error } = await db.from("booking_photos").insert({ booking_id: bookingId, author_id: userId, kind, path });
  if (error) return { error: "Photo non enregistrée." };
  revalidatePath(`/reservations/${bookingId}`);
  return { ok: true };
}
