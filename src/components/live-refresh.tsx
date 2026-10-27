"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Rafraîchit la page quand un message arrive ou que la réservation change.
 * La RLS s'applique aussi au temps réel : seuls les participants reçoivent les événements.
 */
export function LiveRefresh({ bookingId, inquiryId }: { bookingId?: string; inquiryId?: string }) {
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
      const filter = bookingId ? `booking_id=eq.${bookingId}` : `inquiry_id=eq.${inquiryId}`;
      channel = supabase
        .channel(`thread-${bookingId ?? inquiryId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter }, () => router.refresh());
      if (bookingId) {
        channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` }, () => router.refresh());
      }
      channel.subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [bookingId, inquiryId, router]);
  return null;
}

/** Boîte de réception : rafraîchit la liste à chaque nouveau message reçu (la RLS ne transmet que ceux du membre). */
export function LiveInbox() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel("inbox")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => router.refresh())
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);
  return null;
}
