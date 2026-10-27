"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Rafraîchit la page quand un message arrive ou que la réservation change.
 * La RLS s'applique aussi au temps réel : seuls les participants reçoivent les événements.
 */
export function LiveRefresh({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    (async () => {
      // Sans jeton utilisateur, le canal serait anonyme et la RLS filtrerait tous les événements.
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`booking-${bookingId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` }, () => router.refresh())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` }, () => router.refresh())
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [bookingId, router]);
  return null;
}
