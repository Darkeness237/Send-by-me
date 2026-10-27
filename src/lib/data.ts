import "server-only";

import { connection } from "next/server";
import { demoTrips } from "./demo";
import { isSupabaseConfigured } from "./env";
import { normalize } from "./places";
import { createClient } from "./supabase/server";
import type { Booking, Profile, Trip } from "./types";

const TRIP_SELECT =
  "*, traveler:profiles!trips_traveler_id_fkey(id, full_name, avatar_url, bio, city, id_verified, created_at)";

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

const BOOKING_SELECT = `*, trip:trips(${TRIP_SELECT}), sender:profiles!bookings_sender_id_fkey(id, full_name, avatar_url, city, id_verified, created_at)`;

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
