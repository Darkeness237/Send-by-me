"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(4).max(100) }),
});

/** Enregistre l'abonnement push de cet appareil. */
export async function savePushSubscription(raw: unknown) {
  const userId = await getUserId();
  if (!userId) return { error: "Connectez-vous." };
  const parsed = subscriptionSchema.safeParse(raw);
  if (!parsed.success) return { error: "Abonnement invalide." };
  await createAdminClient()
    .from("push_subscriptions")
    .upsert({ endpoint: parsed.data.endpoint, user_id: userId, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  const userId = await getUserId();
  if (!userId) return;
  await createAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
}

export async function markAllNotificationsRead() {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  revalidatePath("/notifications");
}

export async function setWhatsAppNotifications(enabled: boolean) {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ whatsapp_notifications: enabled }).eq("id", userId);
  revalidatePath("/notifications");
}

export async function setEmailNotifications(enabled: boolean) {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ email_notifications: enabled }).eq("id", userId);
  revalidatePath("/notifications");
}
