"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { findCity } from "@/lib/airports";
import { notifySafe } from "@/lib/notify";
import { findPlace, splitCity } from "@/lib/places";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";
import type { FormState } from "./auth";
import { homeDeliveryAvailable } from "@/lib/delivery";

const categoryIds = CATEGORIES.map((c) => c.id) as [string, ...string[]];
const optInt = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(1).max(max).optional());

const requestSchema = z
  .object({
    from_city: z.string().trim().min(2, "Ville de départ manquante").max(120),
    to_city: z.string().trim().min(2, "Ville d'arrivée manquante").max(120),
    earliest_date: z.iso.date("Date « à partir du » invalide"),
    latest_date: z.iso.date("Date « au plus tard » invalide"),
    weight_kg: z.coerce.number().min(0.5, "0,5 kg minimum").max(300, "300 kg maximum"),
    length_cm: optInt(300),
    width_cm: optInt(300),
    height_cm: optInt(300),
    category: z.enum(categoryIds, { error: "Choisissez le type de colis" }),
    description: z.string().trim().min(3, "Décrivez le contenu du colis").max(1000),
    declared_value: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(0).max(10000).optional()),
    max_price_per_kg: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(1).max(200).optional()),
    wants_home_delivery: z.literal("on").optional(),
  })
  .refine((d) => d.latest_date >= d.earliest_date, { message: "La date limite doit suivre la date de départ" });

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

const place = (raw: string) => {
  const { city, country } = splitCity(raw);
  const known = findPlace(city);
  const world = findCity(city, country || known?.country);
  return { city: world?.city ?? known?.city ?? city, country: world?.country ?? known?.country ?? (country || "—") };
};

/** Publie une demande d'envoi, puis prévient les voyageurs dont le trajet correspond. */
export async function createRequest(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous pour publier une demande." };
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.latest_date < new Date().toISOString().slice(0, 10)) return { error: "La date limite est déjà passée." };

  // Photos : uniquement des fichiers du dossier du membre.
  const photoRe = new RegExp(`^${userId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`);
  const photos = formData.getAll("photos").map(String).filter((p) => photoRe.test(p)).slice(0, 6);

  const from = place(d.from_city);
  const to = place(d.to_city);
  if (from.city.toLowerCase() === to.city.toLowerCase()) return { error: "Le départ et l'arrivée doivent être différents" };

  const db = createAdminClient();
  const { data, error } = await db
    .from("shipment_requests")
    .insert({
      sender_id: userId,
      from_city: from.city,
      from_country: from.country,
      to_city: to.city,
      to_country: to.country,
      earliest_date: d.earliest_date,
      latest_date: d.latest_date,
      weight_kg: d.weight_kg,
      length_cm: d.length_cm ?? null,
      width_cm: d.width_cm ?? null,
      height_cm: d.height_cm ?? null,
      category: d.category,
      description: d.description,
      declared_value_cents: d.declared_value != null ? Math.round(d.declared_value * 100) : null,
      max_price_per_kg_cents: d.max_price_per_kg != null ? Math.round(d.max_price_per_kg * 100) : null,
      wants_home_delivery: d.wants_home_delivery === "on" && homeDeliveryAvailable(to.country),
      photos,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Demande non enregistrée. Réessayez." };

  // Voyageurs dont un trajet publié correspond : notification dans l'application et sur le téléphone.
  const { data: trips } = await db
    .from("trips")
    .select("traveler_id, capacity_kg, reserved_kg, accepted_categories")
    .eq("status", "published")
    .ilike("from_city", escapeLike(from.city))
    .ilike("to_city", escapeLike(to.city))
    .gte("departure_at", new Date(Math.max(Date.now(), new Date(d.earliest_date).getTime())).toISOString())
    .lte("departure_at", `${d.latest_date}T23:59:59Z`)
    .neq("traveler_id", userId)
    .limit(50);
  const travelers = new Set(
    (trips ?? [])
      .filter((t) => Number(t.capacity_kg) - Number(t.reserved_kg) >= d.weight_kg && (t.accepted_categories as string[]).includes(d.category))
      .map((t) => t.traveler_id as string),
  );
  await Promise.all(
    [...travelers].map((id) =>
      notifySafe(id, {
        kind: "request_match",
        title: "Une demande correspond à votre trajet",
        body: `${d.weight_kg} kg à envoyer de ${from.city} à ${to.city}. Proposez votre trajet à l'expéditeur.`,
        href: `/demandes/${data.id}`,
      }),
    ),
  );

  revalidatePath("/demandes");
  redirect(`/demandes/${data.id}?publiee=1`);
}

export async function closeRequest(requestId: string) {
  const userId = await getUserId();
  if (!userId || !z.uuid().safeParse(requestId).success) return;
  const supabase = await createClient();
  await supabase.from("shipment_requests").update({ status: "closed" }).eq("id", requestId).eq("sender_id", userId);
  revalidatePath(`/demandes/${requestId}`);
  revalidatePath("/demandes");
}

/** Le voyageur propose un de ses trajets à l'auteur d'une demande : une discussion s'ouvre avec un premier message. */
export async function proposeTrip(requestId: string, tripId: string) {
  const userId = await getUserId();
  if (!userId) redirect(`/connexion?suite=/demandes/${requestId}`);
  if (!z.uuid().safeParse(requestId).success || !z.uuid().safeParse(tripId).success) redirect("/demandes");

  const db = createAdminClient();
  const [{ data: req }, { data: trip }] = await Promise.all([
    db.from("shipment_requests").select("id, sender_id, status, weight_kg, from_city, to_city").eq("id", requestId).maybeSingle(),
    db.from("trips").select("id, traveler_id, status, departure_at").eq("id", tripId).maybeSingle(),
  ]);
  if (!req || req.status !== "open" || !trip || trip.traveler_id !== userId || trip.status !== "published" || req.sender_id === userId) {
    redirect(`/demandes/${requestId}`);
  }

  const { data: existing } = await db.from("inquiries").select("id").eq("trip_id", tripId).eq("sender_id", req.sender_id).maybeSingle();
  let inquiryId = existing?.id as string | undefined;
  if (!inquiryId) {
    const { data: created } = await db
      .from("inquiries")
      .insert({ trip_id: tripId, sender_id: req.sender_id, traveler_id: userId, request_id: requestId })
      .select("id")
      .single();
    inquiryId = created?.id as string | undefined;
    if (!inquiryId) redirect(`/demandes/${requestId}`);
    await db.from("messages").insert({
      inquiry_id: inquiryId,
      author_id: userId,
      body: `Bonjour ! J'ai vu votre demande (${req.weight_kg} kg, ${req.from_city} → ${req.to_city}). Mon trajet correspond : vous pouvez réserver directement depuis l'annonce, ou me poser vos questions ici.`,
    });
  }
  await notifySafe(req.sender_id, {
    kind: "trip_proposed",
    title: "Un voyageur vous propose son trajet",
    body: `Pour votre colis ${req.from_city} → ${req.to_city}. Répondez-lui dans la messagerie.`,
    href: `/messages/${inquiryId}`,
    email: true,
  });
  redirect(`/messages/${inquiryId}`);
}
