"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { zonedToUtc } from "@/lib/format";
import { findPlace } from "@/lib/places";
import { createClient, getUserId } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";
import type { FormState } from "./auth";

const categoryIds = CATEGORIES.map((c) => c.id) as [string, ...string[]];

const tripSchema = z
  .object({
    from_city: z.string().trim().min(2, "Ville de départ manquante").max(80),
    to_city: z.string().trim().min(2, "Ville d'arrivée manquante").max(80),
    departure_date: z.iso.date("Date de départ invalide"),
    departure_time: z.string().regex(/^\d{2}:\d{2}$/, "Heure de départ invalide"),
    mode: z.enum(["plane", "car", "bus", "train"]),
    capacity_kg: z.coerce.number().min(1, "Au moins 1 kg").max(100, "100 kg maximum"),
    price_per_kg: z.coerce.number().min(1, "1 € minimum par kg").max(100, "100 € maximum par kg"),
    accepted_categories: z.array(z.enum(categoryIds)).min(1, "Choisissez au moins un type de colis"),
    pickup_note: z.string().trim().max(300).optional(),
    dropoff_note: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((d) => d.from_city.toLowerCase() !== d.to_city.toLowerCase(), {
    message: "Le départ et l'arrivée doivent être différents",
  });

export async function publishTrip(_: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: "Mode démo : connectez Supabase pour publier un trajet." };
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous pour publier un trajet." };

  const parsed = tripSchema.safeParse({
    ...Object.fromEntries(formData),
    accepted_categories: formData.getAll("accepted_categories"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const from = findPlace(d.from_city);
  const to = findPlace(d.to_city);

  // L'heure saisie est l'heure locale de la ville de départ.
  const departure = zonedToUtc(d.departure_date, d.departure_time, from?.tz ?? "Europe/Paris");
  if (Number.isNaN(departure.getTime()) || departure.getTime() < Date.now() + 3600_000) {
    return { error: "Le départ doit être dans le futur (au moins dans une heure)." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .insert({
      traveler_id: userId,
      from_city: from?.city ?? d.from_city,
      from_country: from?.country ?? "—",
      to_city: to?.city ?? d.to_city,
      to_country: to?.country ?? "—",
      departure_at: departure.toISOString(),
      mode: d.mode,
      capacity_kg: d.capacity_kg,
      price_per_kg_cents: Math.round(d.price_per_kg * 100),
      accepted_categories: d.accepted_categories,
      pickup_note: d.pickup_note || null,
      dropoff_note: d.dropoff_note || null,
      notes: d.notes || null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Impossible de publier le trajet. Vérifiez les champs et réessayez." };
  revalidatePath("/recherche");
  redirect(`/trajets/${data.id}?publie=1`);
}

export async function cancelTrip(tripId: string) {
  const userId = await getUserId();
  if (!userId) redirect("/connexion");
  const supabase = await createClient();
  // RLS : seul le voyageur peut modifier son trajet. On n'annule que s'il n'y a aucune réservation active.
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId)
    .in("status", ["accepted", "paid", "picked_up"]);
  if (count) return;
  await supabase.from("trips").update({ status: "cancelled" }).eq("id", tripId).eq("traveler_id", userId);
  revalidatePath("/espace");
}
