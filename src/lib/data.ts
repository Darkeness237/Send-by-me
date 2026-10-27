import "server-only";

import { connection } from "next/server";
import { demoTrips } from "./demo";
import { isSupabaseConfigured } from "./env";
import { normalize } from "./places";
import { createClient } from "./supabase/server";
import { computeMarket, type MarketPrice } from "./price-guide";
import type { Booking, Profile, Trip } from "./types";

const TRIP_SELECT =
  "*, traveler:profiles!trips_traveler_id_fkey(id, full_name, avatar_url, bio, city, id_verified, address_verified, certified, created_at)";

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
  await connection();
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
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
