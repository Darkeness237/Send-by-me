"use server";

import { z } from "zod";
import { createClient, getUserId } from "@/lib/supabase/server";

export type IceServer = { urls: string | string[]; username?: string; credential?: string };

/**
 * Serveurs ICE pour un appel. STUN public par défaut ; un relais TURN (TURN_URLS, TURN_USERNAME,
 * TURN_CREDENTIAL) améliore la connexion derrière les réseaux mobiles stricts. Les identifiants TURN
 * ne sont remis qu'aux participants de la réservation.
 */
export async function getIceServers(bookingId: string): Promise<IceServer[] | null> {
  const userId = await getUserId();
  if (!userId || !z.uuid().safeParse(bookingId).success) return null;

  // RLS : la réservation n'est lisible que par l'expéditeur et le voyageur.
  const supabase = await createClient();
  const { data } = await supabase.from("bookings").select("id").eq("id", bookingId).maybeSingle();
  if (!data) return null;

  const servers: IceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const turn = process.env.TURN_URLS;
  if (turn && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    servers.push({ urls: turn.split(",").map((u) => u.trim()), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }
  return servers;
}
