import { savePushSubscription } from "@/app/actions/notifications";

export const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export const pushSupported = () =>
  Boolean(VAPID_KEY) && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Abonne cet appareil (permission déjà accordée) et l'enregistre pour le membre connecté. */
export async function subscribePush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_KEY!) }));
  const r = await savePushSubscription(sub.toJSON());
  return !("error" in r);
}
