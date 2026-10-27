"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

/** Ouvre (ou retrouve) la discussion entre l'expéditeur et le voyageur d'un trajet, avant toute réservation. */
export async function startInquiry(tripId: string) {
  const userId = await getUserId();
  if (!userId) redirect(`/connexion?suite=/trajets/${tripId}`);
  if (!z.uuid().safeParse(tripId).success) redirect("/recherche");

  const admin = createAdminClient();
  const { data: trip } = await admin.from("trips").select("id, traveler_id, status").eq("id", tripId).maybeSingle();
  if (!trip || trip.status === "cancelled") redirect("/recherche");
  if (trip.traveler_id === userId) redirect(`/trajets/${tripId}`);

  const { data: existing } = await admin.from("inquiries").select("id").eq("trip_id", tripId).eq("sender_id", userId).maybeSingle();
  if (existing) redirect(`/messages/${existing.id}`);

  const { data: created } = await admin
    .from("inquiries")
    .upsert({ trip_id: tripId, sender_id: userId, traveler_id: trip.traveler_id }, { onConflict: "trip_id,sender_id" })
    .select("id")
    .single();
  redirect(created ? `/messages/${created.id}` : `/trajets/${tripId}`);
}
