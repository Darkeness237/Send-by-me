"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fingerprint, hashDistance, SAME_PHOTO_DISTANCE } from "@/lib/photo-hash";
import { MAX_PHOTOS_PER_STEP, PHOTO_STEPS, type PhotoKind } from "@/lib/parcel-photos";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/types";
import { getActionT } from "@/i18n/server";

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
  if ((count ?? 0) >= MAX_PHOTOS_PER_STEP) return { error: (await getActionT())("{n} photos maximum pour cette étape.", { n: MAX_PHOTOS_PER_STEP }) };

  // Le fichier doit vraiment exister dans le stockage.
  const { data: file } = await db.storage.from("parcel-photos").download(path);
  if (!file) return { error: "Photo introuvable : réessayez l'envoi." };

  // Chaque étape demande une nouvelle prise de vue : pas la même photo réutilisée (même recompressée),
  // ni une photo déjà envoyée pour un autre colis.
  const { sha, phash } = await fingerprint(Buffer.from(await file.arrayBuffer()));
  const [{ data: here }, { data: elsewhere }] = await Promise.all([
    db.from("booking_photos").select("kind, content_hash, phash").eq("booking_id", bookingId),
    db
      .from("booking_photos")
      .select("id")
      .neq("booking_id", bookingId)
      .or(phash ? `content_hash.eq.${sha},phash.eq.${phash}` : `content_hash.eq.${sha}`)
      .limit(1),
  ]);
  const twin = (here ?? []).find((p) => p.content_hash === sha || (phash && p.phash && hashDistance(phash, p.phash) <= SAME_PHOTO_DISTANCE));
  if (twin || elsewhere?.length) {
    await db.storage.from("parcel-photos").remove([path]);
    const step = PHOTO_STEPS.find((s) => s.kind === twin?.kind);
    return {
      error: twin
        ? `Cette photo est identique à celle de l'étape « ${step?.label ?? "précédente"} ». Prenez une nouvelle photo du colis maintenant.`
        : "Cette photo a déjà servi pour un autre envoi. Prenez une nouvelle photo de ce colis.",
    };
  }

  const { error } = await db.from("booking_photos").insert({ booking_id: bookingId, author_id: userId, kind, path, content_hash: sha, phash });
  if (error) return { error: "Photo non enregistrée." };
  revalidatePath(`/reservations/${bookingId}`);
  return { ok: true };
}

/**
 * Retire une photo prise par erreur, pour en reprendre une. Seulement par son auteur et tant que l'étape
 * est ouverte : une fois l'envoi passé à l'étape suivante, les photos restent comme preuve.
 */
export async function removeBookingPhoto(photoId: string) {
  const userId = await getUserId();
  if (!userId || !uuid.safeParse(photoId).success) return { error: "Action non autorisée." };
  const db = createAdminClient();
  const { data: p } = await db.from("booking_photos").select("id, booking_id, author_id, kind, path, booking:bookings(status)").eq("id", photoId).maybeSingle();
  if (!p || p.author_id !== userId) return { error: "Action non autorisée." };
  const booking = Array.isArray(p.booking) ? p.booking[0] : p.booking;
  const step = PHOTO_STEPS.find((s) => s.kind === p.kind);
  if (!step || !booking || !step.when.includes(booking.status as BookingStatus)) return { error: "Cette étape est terminée : la photo ne peut plus être retirée." };
  const { error } = await db.from("booking_photos").delete().eq("id", p.id);
  if (error) return { error: "Photo non retirée. Réessayez." };
  await db.storage.from("parcel-photos").remove([p.path as string]);
  revalidatePath(`/reservations/${p.booking_id}`);
  return { ok: true };
}
