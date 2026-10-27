"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "unsupported" | "denied" | "off" | "on" | "busy";

/** Active ou coupe les notifications push sur cet appareil (téléphone, ordinateur, application installée). */
export function PushToggle() {
  const [state, setState] = useState<State>("busy");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supported = Boolean(KEY) && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return alive && setState("unsupported");
      if (Notification.permission === "denied") return alive && setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (alive) setState(sub ? "on" : "off");
    })().catch(() => alive && setState("unsupported"));
    return () => {
      alive = false;
    };
  }, []);

  if (!KEY) return <p className="text-sm text-muted">Les notifications sur l&apos;appareil arrivent bientôt. Vous les recevez déjà ici et par e-mail.</p>;
  if (state === "unsupported")
    return <p className="text-sm text-muted">Sur iPhone, installez d&apos;abord l&apos;application (Partager › Sur l&apos;écran d&apos;accueil) pour recevoir les notifications.</p>;
  if (state === "denied") return <p className="text-sm text-muted">Les notifications sont bloquées pour ce site dans les réglages de votre navigateur.</p>;

  return state === "on" ? (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        setState("busy");
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setState("off");
      }}
    >
      <BellOff className="h-4 w-4" aria-hidden="true" /> Couper sur cet appareil
    </Button>
  ) : (
    <Button
      size="sm"
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        try {
          if ((await Notification.requestPermission()) !== "granted") return setState("denied");
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY!) });
          const r = await savePushSubscription(sub.toJSON());
          setState("error" in r ? "off" : "on");
        } catch {
          setState("off");
        }
      }}
    >
      <Bell className="h-4 w-4" aria-hidden="true" /> Activer les notifications sur cet appareil
    </Button>
  );
}
