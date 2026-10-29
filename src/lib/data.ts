import "server-only";

import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { demoTrips } from "./demo";
import { isSupabaseConfigured } from "./env";
import { normalize } from "./places";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { createPublicClient } from "./supabase/public";
import { computeMarket, type MarketPrice } from "./price-guide";
import type { AmbassadorReward } from "./ambassador";
import type { Booking, PriceOffer, Profile, Trip } from "./types";

const TRIP_SELECT =
  "*, traveler:profiles!trips_traveler_id_fkey(id, full_name, avatar_url, bio, city, id_verified, address_verified, certified, ambassador_since, created_at)";

async function withRatings<T extends { traveler?: Profile | null }>(rows: T[]): Promise<T[]> {
  const ids = [...new Set(rows.map((r) => r.traveler?.id).filter(Boolean))] as string[];
  if (!ids.length) return rows;
  const supabase = await createClient();
  const { data } = await supabase.from("profile_ratings").select("*").in("profile_id", ids);
  const map = new Map((data ?? []).map((r) => [r.profile_id as string, r]));
  return rows.map((r) => {
    if (!r.traveler) return r;
    const rating = map.get(r.traveler.id);
    return {
      ...r,
      traveler: { ...r.traveler, rating_avg: rating?.rating_avg ?? null, rating_count: rating?.rating_count ?? 0 },
    };
  });
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export type TripSearch = { from?: string; to?: string; date?: string; kg?: number };

/** Prochains départs publiés, identiques pour tous les visiteurs : mis en cache quelques minutes. */
export async function getUpcomingTrips(limit = 6, from?: string, to?: string): Promise<Trip[]> {
  "use cache";
  cacheLife("minutes");
  if (!isSupabaseConfigured) return demoTrips().slice(0, limit);
  const db = createPublicClient();
  let query = db
    .from("trips")
    .select(TRIP_SELECT)
    .eq("status", "published")
    .gte("departure_at", new Date().toISOString())
    .order("featured", { ascending: false })
    .order("departure_at", { ascending: true })
    .limit(limit);
  if (from) query = query.ilike("from_city", escapeLike(from));
  if (to) query = query.ilike("to_city", escapeLike(to));
  // Base injoignable (y compris pendant la compilation) : liste vide plutôt qu'une page en erreur.
  const { data, error } = await query.then((r) => r, (e: unknown) => ({ data: null, error: e }));
  if (error) {
    console.error("Prochains départs", error instanceof Error ? error.message : error);
    return [];
  }
  const trips = (data ?? []) as Trip[];
  const ids = [...new Set(trips.map((t) => t.traveler?.id).filter(Boolean))] as string[];
  if (!ids.length) return trips;
  const { data: ratings } = await db.from("profile_ratings").select("*").in("profile_id", ids).then((r) => r, () => ({ data: null }));
  const map = new Map((ratings ?? []).map((r) => [r.profile_id as string, r]));
  return trips.map((t) => (t.traveler ? { ...t, traveler: { ...t.traveler, rating_avg: map.get(t.traveler.id)?.rating_avg ?? null, rating_count: map.get(t.traveler.id)?.rating_count ?? 0 } } : t));
}

export async function searchTrips(q: TripSearch, limit = 30): Promise<Trip[]> {
  await connection();
  if (!isSupabaseConfigured) {
    return demoTrips().filter(
      (t) =>
        (!q.from || normalize(t.from_city) === normalize(q.from)) &&
        (!q.to || normalize(t.to_city) === normalize(q.to)) &&
        (!q.date || t.departure_at.slice(0, 10) >= q.date) &&
        (!q.kg || t.capacity_kg - t.reserved_kg >= q.kg),
    ).slice(0, limit);
  }

  const supabase = await createClient();
  let query = supabase
    .from("trips")
    .select(TRIP_SELECT)
    .eq("status", "published")
    .gte("departure_at", q.date ? new Date(q.date).toISOString() : new Date().toISOString())
    .order("featured", { ascending: false }) // trajets mis en avant en tête
    .order("departure_at", { ascending: true })
    .limit(limit);
  if (q.from) query = query.ilike("from_city", escapeLike(q.from));
  if (q.to) query = query.ilike("to_city", escapeLike(q.to));

  const { data, error } = await query;
  if (error) throw error;
  let trips = (data ?? []) as Trip[];
  if (q.kg) trips = trips.filter((t) => t.capacity_kg - t.reserved_kg >= q.kg!);
  return withRatings(trips);
}

export async function getTrip(id: string): Promise<Trip | null> {
  await connection();
  if (!isSupabaseConfigured) return demoTrips().find((t) => t.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("trips").select(TRIP_SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  const [trip] = await withRatings([data as Trip]);
  return trip;
}

export async function getProfile(id: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile) ?? null;
}

const BOOKING_SELECT = `*, trip:trips(${TRIP_SELECT}), sender:profiles!bookings_sender_id_fkey(id, full_name, avatar_url, city, id_verified, certified, created_at)`;

export async function getMyTrips(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trips")
    .select("*, bookings(*, sender:profiles!bookings_sender_id_fkey(id, full_name, id_verified))")
    .eq("traveler_id", userId)
    .order("departure_at", { ascending: false });
  return (data ?? []) as (Trip & { bookings: Booking[] })[];
}

export async function getMySendings(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("sender_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Booking[];
}

export async function getBooking(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
  return (data as Booking) ?? null;
}

export async function getDeliveryCode(bookingId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_secrets")
    .select("delivery_code")
    .eq("booking_id", bookingId)
    .maybeSingle();
  return (data?.delivery_code as string | undefined) ?? null;
}

export async function getMessages(bookingId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, author_id, body, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true })
    .limit(500);
  return data ?? [];
}

/** Alertes de ligne de l'utilisateur, avec le nombre de trajets à venir sur chaque ligne. */
export async function getMyAlerts(userId: string) {
  const supabase = await createClient();
  const { data: alerts } = await supabase
    .from("route_alerts")
    .select("id, from_city, to_city, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (!alerts?.length) return [];
  const now = new Date().toISOString();
  return Promise.all(
    alerts.map(async (a) => {
      const { count } = await supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .ilike("from_city", escapeLike(a.from_city))
        .ilike("to_city", escapeLike(a.to_city))
        .gte("departure_at", now)
        .neq("traveler_id", userId);
      return { ...a, upcoming: count ?? 0 };
    }),
  );
}

/** État du justificatif de voyage, pour le voyageur (RLS : lui seul le voit). */
export async function getTripProof(tripId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("trip_proofs").select("status, rejection_reason").eq("trip_id", tripId).maybeSingle();
  return data as { status: "pending" | "approved" | "rejected"; rejection_reason: string | null } | null;
}

// ── Messagerie ──────────────────────────────────────────────────
export type Thread = {
  id: string;
  kind: "booking" | "inquiry";
  href: string;
  otherName: string;
  otherVerified: boolean;
  otherCertified: boolean;
  route: string;
  status?: string;
  lastBody: string | null;
  lastAt: string;
  unread: number;
};

type Party = { id: string; full_name: string; id_verified: boolean; certified: boolean } | null;
const first = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/** Toutes les discussions du membre (réservations et questions avant réservation), la plus récente d'abord. */
export async function getInbox(userId: string): Promise<Thread[]> {
  const supabase = await createClient();
  const party = "id, full_name, id_verified, certified";
  const [{ data: bookings }, { data: inquiries }, { data: messages }, { data: reads }] = await Promise.all([
    supabase
      .from("bookings")
      .select(`id, status, created_at, sender:profiles!bookings_sender_id_fkey(${party}), trip:trips(from_city, to_city, traveler:profiles!trips_traveler_id_fkey(${party}))`)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("inquiries")
      .select(`id, created_at, sender_id, sender:profiles!inquiries_sender_id_fkey(${party}), traveler:profiles!inquiries_traveler_id_fkey(${party}), trip:trips(from_city, to_city)`)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("messages").select("booking_id, inquiry_id, author_id, body, created_at").order("created_at", { ascending: false }).limit(1000),
    supabase.from("thread_reads").select("thread_id, read_at").eq("user_id", userId),
  ]);

  const readAt = new Map((reads ?? []).map((r) => [r.thread_id as string, r.read_at as string]));
  const byThread = new Map<string, { last: { body: string; created_at: string } | null; unread: number }>();
  for (const m of messages ?? []) {
    const key = (m.booking_id ?? m.inquiry_id) as string;
    const t = byThread.get(key) ?? { last: null, unread: 0 };
    t.last ??= { body: m.body as string, created_at: m.created_at as string };
    const seen = readAt.get(key);
    if (m.author_id !== userId && (!seen || (m.created_at as string) > seen)) t.unread++;
    byThread.set(key, t);
  }

  const threads: Thread[] = [];
  for (const b of bookings ?? []) {
    const trip = first(b.trip as unknown) as { from_city: string; to_city: string; traveler: Party | Party[] } | null;
    const traveler = first(trip?.traveler) as Party;
    const sender = first(b.sender as unknown) as Party;
    const other = sender?.id === userId ? traveler : sender;
    const t = byThread.get(b.id as string);
    threads.push({
      id: b.id as string,
      kind: "booking",
      href: `/reservations/${b.id}`,
      otherName: other?.full_name || "Membre",
      otherVerified: !!other?.id_verified,
      otherCertified: !!other?.certified,
      route: trip ? `${trip.from_city} → ${trip.to_city}` : "",
      status: b.status as string,
      lastBody: t?.last?.body ?? null,
      lastAt: t?.last?.created_at ?? (b.created_at as string),
      unread: t?.unread ?? 0,
    });
  }
  for (const i of inquiries ?? []) {
    const trip = first(i.trip as unknown) as { from_city: string; to_city: string } | null;
    const other = (i.sender_id === userId ? first(i.traveler as unknown) : first(i.sender as unknown)) as Party;
    const t = byThread.get(i.id as string);
    threads.push({
      id: i.id as string,
      kind: "inquiry",
      href: `/messages/${i.id}`,
      otherName: other?.full_name || "Membre",
      otherVerified: !!other?.id_verified,
      otherCertified: !!other?.certified,
      route: trip ? `${trip.from_city} → ${trip.to_city}` : "",
      lastBody: t?.last?.body ?? null,
      lastAt: t?.last?.created_at ?? (i.created_at as string),
      unread: t?.unread ?? 0,
    });
  }
  return threads.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}

export async function getUnreadCount(userId: string) {
  return (await getInbox(userId)).reduce((n, t) => n + t.unread, 0);
}

/** Marque une discussion comme lue (appelé à l'ouverture de la conversation). */
export async function markThreadRead(userId: string, threadId: string) {
  const supabase = await createClient();
  await supabase.from("thread_reads").upsert({ user_id: userId, thread_id: threadId, read_at: new Date().toISOString() });
}

export async function getInquiry(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const party = "id, full_name, avatar_url, id_verified, certified, created_at";
  const { data } = await supabase
    .from("inquiries")
    .select(`id, trip_id, sender_id, traveler_id, sender:profiles!inquiries_sender_id_fkey(${party}), traveler:profiles!inquiries_traveler_id_fkey(${party}), trip:trips(id, from_city, to_city, departure_at, status, price_per_kg_cents)`)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    sender: first(data.sender as unknown) as Profile | null,
    traveler: first(data.traveler as unknown) as Profile | null,
    trip: first(data.trip as unknown) as Pick<Trip, "id" | "from_city" | "to_city" | "departure_at" | "status" | "price_per_kg_cents"> | null,
  };
}

export async function getThreadMessages(thread: { bookingId?: string; inquiryId?: string }) {
  const supabase = await createClient();
  let q = supabase.from("messages").select("id, author_id, body, created_at");
  q = thread.bookingId ? q.eq("booking_id", thread.bookingId) : q.eq("inquiry_id", thread.inquiryId!);
  const { data } = await q.order("created_at", { ascending: true }).limit(500);
  return data ?? [];
}

/** Prix observés par ligne sur les 6 derniers mois (pour le prix conseillé). */
export async function getMarketPrices(): Promise<MarketPrice[]> {
  "use cache";
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];
  const supabase = createPublicClient();
  const since = new Date(Date.now() - 180 * 864e5).toISOString();
  const { data } = await supabase
    .from("trips")
    .select("from_city, to_city, mode, price_per_kg_cents")
    .neq("status", "cancelled")
    .gte("created_at", since)
    .limit(5000);
  return computeMarket((data ?? []) as Parameters<typeof computeMarket>[0]);
}

// ── Parrainage ──────────────────────────────────────────────────
export async function getCreditBalance(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("credit_entries").select("amount_cents").eq("user_id", userId);
  return (data ?? []).reduce((n, e) => n + (e.amount_cents as number), 0);
}

export async function getReferrer(code: string) {
  await connection();
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name").eq("referral_code", code).maybeSingle();
  return data as { full_name: string } | null;
}

export async function getReferralStats(userId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: referrals }, { data: credits }] = await Promise.all([
    supabase.from("profiles").select("referral_code").eq("id", userId).single(),
    supabase.from("referrals").select("status, created_at, referee:profiles!referrals_referee_id_fkey(full_name)").eq("referrer_id", userId).order("created_at", { ascending: false }),
    supabase.from("credit_entries").select("amount_cents, reason, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  const list = (referrals ?? []).map((r) => ({
    status: r.status as "pending" | "rewarded",
    created_at: r.created_at as string,
    name: (first(r.referee as unknown) as { full_name: string } | null)?.full_name || "Membre",
  }));
  return {
    code: (profile?.referral_code as string) ?? "",
    referrals: list,
    balance: (credits ?? []).reduce((n, e) => n + (e.amount_cents as number), 0),
    earned: (credits ?? []).filter((e) => e.reason === "referral_reward").reduce((n, e) => n + (e.amount_cents as number), 0),
    credits: (credits ?? []) as { amount_cents: number; reason: string; created_at: string }[],
  };
}

/** Programme Ambassadeur : statut, progression et primes du membre (RLS : ses propres primes). */
export async function getAmbassadorData(userId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: trips }, { data: reviews }, { data: rewards }] = await Promise.all([
    supabase.from("profiles").select("full_name, referral_code, id_verified, ambassador_since").eq("id", userId).single(),
    supabase.from("trips").select("id, bookings(status)").eq("traveler_id", userId),
    supabase.from("reviews").select("rating").eq("subject_id", userId),
    supabase.from("ambassador_rewards").select("id, kind, amount_cents, milestone, created_at, paid_at").eq("traveler_id", userId).order("created_at", { ascending: false }),
  ]);
  const deliveries = (trips ?? []).reduce(
    (n, t) => n + ((t.bookings as { status: string }[] | null) ?? []).filter((b) => b.status === "delivered").length,
    0,
  );
  const ratings = (reviews ?? []).map((r) => r.rating as number);
  const list = (rewards ?? []) as AmbassadorReward[];
  return {
    name: (profile?.full_name as string) || "",
    code: (profile?.referral_code as string) ?? "",
    idVerified: Boolean(profile?.id_verified),
    since: (profile?.ambassador_since as string | null) ?? null,
    deliveries,
    rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    ratingCount: ratings.length,
    rewards: list,
    pendingCents: list.filter((r) => !r.paid_at).reduce((n, r) => n + r.amount_cents, 0),
    paidCents: list.filter((r) => r.paid_at).reduce((n, r) => n + r.amount_cents, 0),
  };
}

// ── Suivi d'envoi ───────────────────────────────────────────────
export type TrackingEvent = { kind: string; at: string; note: string | null };

export async function getTrackingEvents(bookingId: string): Promise<TrackingEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_events")
    .select("kind, created_at, note")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((e) => ({ kind: e.kind as string, at: e.created_at as string, note: (e.note as string) ?? null }));
}

/** Photos du colis (participants uniquement, RLS), avec des liens temporaires vers le stockage privé. */
export async function getBookingPhotos(bookingId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_photos")
    .select("id, kind, path, author_id, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: signed } = await supabase.storage.from("parcel-photos").createSignedUrls(rows.map((r) => r.path as string), 3600);
  return rows.map((r, i) => ({ id: r.id as string, kind: r.kind as string, url: signed?.[i]?.signedUrl ?? null, at: r.created_at as string }));
}

/** Négociation du prix d'une réservation (participants uniquement, RLS). */
export async function getPriceOffers(bookingId: string): Promise<PriceOffer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("price_offers")
    .select("id, booking_id, author_id, price_per_kg_cents, status, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  return (data ?? []) as PriceOffer[];
}

/** Adresse de livraison à domicile (lisible par l'expéditeur uniquement, RLS). */
export async function getDeliveryAddress(bookingId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("booking_deliveries").select("address").eq("booking_id", bookingId).maybeSingle();
  return (data?.address as string) ?? null;
}

export type Shipment = {
  code: string;
  status: string;
  weight_kg: number;
  home_delivery: boolean;
  delivery_status: string | null;
  from_city: string;
  to_city: string;
  from_tz: string | null;
  departure_at: string;
  mode: string;
  transport_ref: string | null;
  events: TrackingEvent[];
};

/** Suivi public par numéro : villes et étapes seulement (fonction en base, sans nom ni adresse). */
export async function trackShipment(code: string): Promise<Shipment | null> {
  await connection();
  if (!isSupabaseConfigured || !/^SBM-[A-Z0-9]{8}$/i.test(code.trim())) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("track_shipment", { p_code: code });
  return (data as Shipment) ?? null;
}

// ── Notifications ───────────────────────────────────────────────
export type AppNotification = { id: number; kind: string; title: string; body: string | null; href: string | null; read_at: string | null; created_at: string };

export async function getNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, kind, title, body, href, read_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as AppNotification[];
}

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
  return count ?? 0;
}

// ── Demandes d'envoi ────────────────────────────────────────────
export type ShipmentRequest = {
  id: string;
  sender_id: string;
  from_city: string;
  from_country: string;
  to_city: string;
  to_country: string;
  earliest_date: string;
  latest_date: string;
  weight_kg: number;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  category: string;
  description: string;
  declared_value_cents: number | null;
  max_price_per_kg_cents: number | null;
  wants_home_delivery: boolean;
  photos: string[];
  status: "open" | "matched" | "closed";
  created_at: string;
  sender?: Profile | null;
};

const REQUEST_SELECT = "*, sender:profiles!shipment_requests_sender_id_fkey(id, full_name, avatar_url, id_verified, certified, created_at)";

export async function listRequests(q: { from?: string; to?: string } = {}, limit = 40): Promise<ShipmentRequest[]> {
  await connection();
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  let query = supabase
    .from("shipment_requests")
    .select(REQUEST_SELECT)
    .eq("status", "open")
    .gte("latest_date", new Date().toISOString().slice(0, 10))
    .order("earliest_date", { ascending: true })
    .limit(limit);
  if (q.from) query = query.ilike("from_city", escapeLike(q.from));
  if (q.to) query = query.ilike("to_city", escapeLike(q.to));
  const { data } = await query;
  return (data ?? []) as ShipmentRequest[];
}

export async function getRequest(id: string): Promise<ShipmentRequest | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("shipment_requests").select(REQUEST_SELECT).eq("id", id).maybeSingle();
  return (data as ShipmentRequest) ?? null;
}

export async function getMyRequests(userId: string): Promise<ShipmentRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("shipment_requests").select("*").eq("sender_id", userId).order("created_at", { ascending: false });
  return (data ?? []) as ShipmentRequest[];
}

/** Trajets publiés qui conviennent à une demande : même ligne, dans les dates, assez de kilos, type de colis accepté. */
export async function matchingTrips(r: ShipmentRequest, limit = 12): Promise<Trip[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trips")
    .select(TRIP_SELECT)
    .eq("status", "published")
    .ilike("from_city", escapeLike(r.from_city))
    .ilike("to_city", escapeLike(r.to_city))
    .gte("departure_at", new Date(Math.max(Date.now(), new Date(r.earliest_date).getTime())).toISOString())
    .lte("departure_at", `${r.latest_date}T23:59:59Z`)
    .order("departure_at", { ascending: true })
    .limit(50);
  const trips = ((data ?? []) as Trip[]).filter(
    (t) =>
      t.capacity_kg - t.reserved_kg >= Number(r.weight_kg) &&
      (t.accepted_categories as string[]).includes(r.category) &&
      (!r.max_price_per_kg_cents || t.price_per_kg_cents <= r.max_price_per_kg_cents),
  );
  return withRatings(trips.slice(0, limit));
}

/** Demandes ouvertes qui conviennent à un trajet (pour le voyageur). */
export async function matchingRequests(t: Trip, limit = 12): Promise<ShipmentRequest[]> {
  const supabase = await createClient();
  const day = t.departure_at.slice(0, 10);
  const { data } = await supabase
    .from("shipment_requests")
    .select(REQUEST_SELECT)
    .eq("status", "open")
    .ilike("from_city", escapeLike(t.from_city))
    .ilike("to_city", escapeLike(t.to_city))
    .lte("earliest_date", day)
    .gte("latest_date", day)
    .neq("sender_id", t.traveler_id)
    .limit(50);
  const left = t.capacity_kg - t.reserved_kg;
  return ((data ?? []) as ShipmentRequest[])
    .filter((r) => Number(r.weight_kg) <= left && (t.accepted_categories as string[]).includes(r.category))
    .slice(0, limit);
}

// ── Preuves sur l'accueil : uniquement des données réelles ──────
export type HomeReview = { rating: number; comment: string; author: string; route: string | null; created_at: string };

/** Chiffres en direct et derniers avis publiés (un chiffre trop petit n'est pas renvoyé : il desservirait). */
export async function getHomeProof() {
  "use cache";
  cacheLife("minutes");
  if (!isSupabaseConfigured) return { upcomingTrips: 0, availableKg: 0, delivered: 0, ratingAvg: null as number | null, ratingCount: 0, reviews: [] as HomeReview[] };
  const db = createAdminClient();
  const now = new Date().toISOString();
  const [{ data: trips }, { count: delivered }, { data: ratings }, { data: reviews }] = await Promise.all([
    db.from("trips").select("capacity_kg, reserved_kg").eq("status", "published").gt("departure_at", now).limit(5000),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "delivered"),
    db.from("reviews").select("rating").limit(10000),
    db
      .from("reviews")
      .select("rating, comment, created_at, author:profiles!reviews_author_id_fkey(full_name), booking:bookings(trip:trips(from_city, to_city))")
      .gte("rating", 4)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const list = (ratings ?? []).map((r) => r.rating as number);
  // Prénom + initiale : l'avis reste attribué sans exposer le nom complet.
  const shortName = (full: string) => {
    const [firstName, last] = full.trim().split(/\s+/);
    return [firstName, last ? `${last[0].toUpperCase()}.` : ""].filter(Boolean).join(" ") || "Membre";
  };
  return {
    upcomingTrips: (trips ?? []).length,
    availableKg: Math.round((trips ?? []).reduce((n, t) => n + Math.max(0, Number(t.capacity_kg) - Number(t.reserved_kg)), 0)),
    delivered: delivered ?? 0,
    ratingAvg: list.length ? list.reduce((a, b) => a + b, 0) / list.length : null,
    ratingCount: list.length,
    reviews: (reviews ?? [])
      .filter((r) => ((r.comment as string) ?? "").trim().length >= 20)
      .filter((r, i, all) => all.findIndex((o) => (o.comment as string).trim() === (r.comment as string).trim()) === i)
      .slice(0, 6)
      .map((r) => {
        const trip = (first(first(r.booking as unknown) as { trip: unknown } | null)?.trip ?? null) as { from_city: string; to_city: string } | null;
        return {
          rating: r.rating as number,
          comment: (r.comment as string).trim(),
          author: shortName((first(r.author as unknown) as { full_name: string } | null)?.full_name || ""),
          route: trip ? `${trip.from_city} → ${trip.to_city}` : null,
          created_at: r.created_at as string,
        };
      }),
  };
}
