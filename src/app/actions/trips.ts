"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { getMarketPrices } from "@/lib/data";
import { checkFlight, normalizeFlightNumber } from "@/lib/flights";
import { priceGuide } from "@/lib/price-guide";
import { euros } from "@/lib/pricing";
import { zonedToUtc } from "@/lib/format";
import { findPlace } from "@/lib/places";
import { createAdminClient } from "@/lib/supabase/admin";
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
    capacity_kg: z.coerce.number().min(1, "Au moins 1 kg").max(300, "300 kg maximum"),
    price_per_kg: z.coerce.number().min(1, "1 € minimum par kg").max(100, "100 € maximum par kg"),
    accepted_categories: z.array(z.enum(categoryIds)).min(1, "Choisissez au moins un type de colis"),
    pickup_note: z.string().trim().max(300).optional(),
    dropoff_note: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(1000).optional(),
    carrier: z.string().trim().max(80).optional(),
    transport_ref: z.string().trim().max(20).optional(),
    from_airport: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
    to_airport: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
    has_stopover: z.literal("on").optional(),
    baggage_allowance_kg: z.coerce.number().min(0).max(200).optional(),
    ticket_name_matches: z.literal("on").optional(),
    home_delivery_price: z.coerce.number().min(1, "Forfait de livraison : 1 € minimum").max(100, "Forfait de livraison : 100 € maximum").default(10),
    home_delivery_area: z.string().trim().max(200).optional(),
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

  // Informations de transport et contrôles automatiques.
  let transport: Record<string, unknown> = {};
  let transportCheck: Awaited<ReturnType<typeof checkFlight>> | null = null;
  if (d.mode === "plane") {
    if (!d.carrier || !d.transport_ref || !d.from_airport || !d.to_airport) {
      return { error: "Indiquez la compagnie, le numéro de vol et les aéroports." };
    }
    if (d.ticket_name_matches !== "on") return { error: "Confirmez que le nom sur votre billet correspond à votre pièce d'identité." };
    const flightNumber = normalizeFlightNumber(d.transport_ref);
    const check = await checkFlight({
      carrier: d.carrier,
      flightNumber,
      fromCity: from?.city ?? d.from_city,
      toCity: to?.city ?? d.to_city,
      fromAirport: d.from_airport,
      toAirport: d.to_airport,
      hasStopover: d.has_stopover === "on",
      departureUtc: departure,
    });
    if (check.inputError) return { error: `${check.inputError}. Vérifiez votre billet.` };
    transport = {
      carrier: d.carrier,
      transport_ref: flightNumber,
      from_airport: d.from_airport,
      to_airport: d.to_airport,
      has_stopover: d.has_stopover === "on",
      baggage_allowance_kg: d.baggage_allowance_kg ?? null,
    };
    transportCheck = check;
  } else if (d.mode !== "car") {
    if (!d.carrier) return { error: "Indiquez la compagnie de transport." };
    transport = { carrier: d.carrier, transport_ref: d.transport_ref || null };
  }

  // Plafond de prix de la ligne : le total payé par l'expéditeur doit rester raisonnable.
  const guide = priceGuide(from?.city ?? d.from_city, to?.city ?? d.to_city, d.mode, await getMarketPrices());
  if (Math.round(d.price_per_kg * 100) > guide.maxCents) {
    return { error: `Prix trop élevé pour cette ligne : ${euros(guide.maxCents)} le kilo maximum (prix conseillé ${euros(guide.lowCents)} à ${euros(guide.highCents)}).` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .insert({
      ...transport,
      home_delivery_cents: Math.round(d.home_delivery_price * 100),
      home_delivery_area: d.home_delivery_area || null,
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
  if (transportCheck) {
    // Résultat écrit par le serveur : le membre n'a pas le droit de modifier ces colonnes.
    await createAdminClient()
      .from("trips")
      .update({ transport_check: transportCheck.status, transport_check_notes: transportCheck.notes })
      .eq("id", data.id);
  }
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
  const { data: cancelled } = await supabase
    .from("trips")
    .update({ status: "cancelled" })
    .eq("id", tripId)
    .eq("traveler_id", userId)
    .select("id");
  if (cancelled?.length) {
    // Les demandes encore en attente sont refusées automatiquement.
    await createAdminClient()
      .from("bookings")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("trip_id", tripId)
      .eq("status", "pending");
  }
  revalidatePath("/espace");
}
