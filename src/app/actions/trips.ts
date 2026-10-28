"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { getMarketPrices } from "@/lib/data";
import { checkFlight, normalizeFlightNumber } from "@/lib/flights";
import { notifySafe } from "@/lib/notify";
import { priceGuide } from "@/lib/price-guide";
import { BOOST_FEE_CENTS } from "@/lib/ambassador";
import { euros } from "@/lib/pricing";
import { zonedToUtc } from "@/lib/format";
import { findCity } from "@/lib/airports";
import { findPlace, splitCity } from "@/lib/places";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";
import type { FormState } from "./auth";
import { getActionLocale, getActionT } from "@/i18n/server";
import { translateNote } from "@/i18n/patterns";

const categoryIds = CATEGORIES.map((c) => c.id) as [string, ...string[]];

const tripSchema = z
  .object({
    from_city: z.string().trim().min(2, "Ville de départ manquante").max(80),
    to_city: z.string().trim().min(2, "Ville d'arrivée manquante").max(80),
    departure_date: z.iso.date("Date de départ invalide"),
    departure_time: z.string().regex(/^\d{2}:\d{2}$/, "Heure de départ invalide"),
    arrival_date: z.union([z.iso.date("Date d'arrivée invalide"), z.literal("")]).optional(),
    arrival_time: z.union([z.string().regex(/^\d{2}:\d{2}$/, "Heure d'arrivée invalide"), z.literal("")]).optional(),
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

  // « Ville, Pays » : la ville est retrouvée dans la base mondiale des aéroports (pays, fuseau, aéroports).
  const place = (raw: string) => {
    const { city, country } = splitCity(raw);
    const known = findPlace(city);
    const world = findCity(city, country || known?.country);
    return {
      city: world?.city ?? known?.city ?? city,
      country: world?.country ?? known?.country ?? (country || "—"),
      tz: world?.tz ?? known?.tz ?? "Europe/Paris",
      airports: world?.airports.map((a) => a.iata) ?? (known ? [known.code] : []),
    };
  };
  const from = place(d.from_city);
  const to = place(d.to_city);
  if (from.city.toLowerCase() === to.city.toLowerCase()) return { error: "Le départ et l'arrivée doivent être différents" };

  // L'heure saisie est l'heure locale de la ville de départ.
  const departure = zonedToUtc(d.departure_date, d.departure_time, from.tz);
  if (Number.isNaN(departure.getTime()) || departure.getTime() < Date.now() + 3600_000) {
    return { error: "Le départ doit être dans le futur (au moins dans une heure)." };
  }

  // Arrivée prévue (heure locale de la ville d'arrivée) : le suivi passe seul à « Arrivé » à cette heure.
  let arrival: Date | null = null;
  if (d.arrival_date && d.arrival_time) {
    arrival = zonedToUtc(d.arrival_date, d.arrival_time, to.tz);
    const hours = (arrival.getTime() - departure.getTime()) / 3600_000;
    if (Number.isNaN(hours) || hours <= 0) return { error: "L'arrivée doit être après le départ (heure locale de la ville d'arrivée)." };
    if (hours > 72) return { error: "L'arrivée prévue est plus de 3 jours après le départ : vérifiez la date." };
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
      fromCity: from.city,
      toCity: to.city,
      fromAirports: from.airports,
      toAirports: to.airports,
      fromAirport: d.from_airport,
      toAirport: d.to_airport,
      hasStopover: d.has_stopover === "on",
      departureUtc: departure,
    });
    if (check.inputError) return { error: (await getActionT())("{e}. Vérifiez votre billet.", { e: translateNote(check.inputError, await getActionLocale()) }) };
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
  const guide = priceGuide(from.city, to.city, d.mode, await getMarketPrices(), { from: from.country, to: to.country });
  if (Math.round(d.price_per_kg * 100) > guide.maxCents) {
    return { error: (await getActionT())("Prix trop élevé pour cette ligne : {max} le kilo maximum (prix conseillé {low} à {high}).", { max: euros(guide.maxCents), low: euros(guide.lowCents), high: euros(guide.highCents) }) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .insert({
      ...transport,
      traveler_id: userId,
      from_city: from.city,
      from_country: from.country,
      from_tz: from.tz,
      to_city: to.city,
      to_country: to.country,
      to_tz: to.tz,
      departure_at: departure.toISOString(),
      arrival_at: arrival?.toISOString() ?? null,
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
  await notifyMatchingRequesters(data.id, userId, from.city, to.city, departure, d.capacity_kg, d.accepted_categories);
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

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Nouveau trajet : les expéditeurs dont la demande correspond sont prévenus (e-mail compris). */
async function notifyMatchingRequesters(tripId: string, travelerId: string, from: string, to: string, departure: Date, capacityKg: number, categories: string[]) {
  const day = departure.toISOString().slice(0, 10);
  const { data: requests } = await createAdminClient()
    .from("shipment_requests")
    .select("sender_id, weight_kg, category")
    .eq("status", "open")
    .ilike("from_city", escapeLike(from))
    .ilike("to_city", escapeLike(to))
    .lte("earliest_date", day)
    .gte("latest_date", day)
    .neq("sender_id", travelerId)
    .limit(100);
  const senders = new Set((requests ?? []).filter((r) => Number(r.weight_kg) <= capacityKg && categories.includes(r.category as string)).map((r) => r.sender_id as string));
  await Promise.all(
    [...senders].map((id) =>
      notifySafe(id, {
        kind: "trip_match",
        title: `Nouveau trajet ${from} → ${to}`,
        body: "Un voyageur part dans vos dates avec assez de kilos pour votre colis. Réservez avant qu'il ne soit complet.",
        href: `/trajets/${tripId}`,
        email: true,
      }),
    ),
  );
}

/** Met un trajet en tête des résultats de sa ligne. 1 € retenu sur le premier versement du trajet, rien sans réservation. */
export async function boostTrip(tripId: string) {
  const userId = await getUserId();
  if (!userId) redirect("/connexion");
  if (!z.uuid().safeParse(tripId).success) return;
  await createAdminClient()
    .from("trips")
    .update({ featured: true, boosted_at: new Date().toISOString(), boost_fee_cents: BOOST_FEE_CENTS })
    .eq("id", tripId)
    .eq("traveler_id", userId)
    .eq("status", "published")
    .eq("featured", false)
    .gt("departure_at", new Date().toISOString());
  revalidatePath(`/trajets/${tripId}`);
}
