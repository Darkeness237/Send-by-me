"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { removePushSubscription } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { pushSupported, subscribePush, VAPID_KEY } from "@/lib/push-client";

const KEY = VAPID_KEY;

type State = "unsupported" | "denied" | "off" | "on" | "busy";

/** Active ou coupe les notifications push sur cet appareil (téléphone, ordinateur, application installée). */
export function PushToggle() {
  const t = useT();
  const [state, setState] = useState<State>("busy");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supported = pushSupported();
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

  if (!KEY) return <p className="text-sm text-muted">{t("Les notifications sur l'appareil arrivent bientôt. Vous les recevez déjà ici et par e-mail.")}</p>;
  if (state === "unsupported")
    return <p className="text-sm text-muted">{t("Sur iPhone, installez d'abord l'application (Partager › Sur l'écran d'accueil) pour recevoir les notifications.")}</p>;
  if (state === "denied") return <p className="text-sm text-muted">{t("Les notifications sont bloquées pour ce site dans les réglages de votre navigateur.")}</p>;

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
      <BellOff className="h-4 w-4" aria-hidden="true" />{" "}{t("Couper sur cet appareil")}
    </Button>
  ) : (
    <Button
      size="sm"
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        try {
          if ((await Notification.requestPermission()) !== "granted") return setState("denied");
          setState((await subscribePush()) ? "on" : "off");
        } catch {
          setState("off");
        }
      }}
    >
      <Bell className="h-4 w-4" aria-hidden="true" />{" "}{t("Activer les notifications sur cet appareil")}
    </Button>
  );
}
