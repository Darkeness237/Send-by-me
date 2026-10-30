"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { pushSupported, subscribePush } from "@/lib/push-client";

const LATER_KEY = "sbm-push-later";
const LATER_MS = 7 * 24 * 3600 * 1000;

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

/**
 * Notifications activées d'office pour les membres connectés : si l'appareil a déjà donné
 * son accord, l'abonnement est (ré)enregistré sans rien demander ; sinon une carte propose
 * d'activer en un geste (les navigateurs exigent un clic pour afficher leur demande).
 */
export function AutoPush() {
  const t = useT();
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    if (Notification.permission === "granted") {
      subscribePush().catch(() => {});
      return;
    }
    if (Notification.permission !== "default") return;
    const later = Number(read(LATER_KEY) ?? 0);
    if (later && new Date().getTime() - later < LATER_MS) return;
    const timer = setTimeout(() => setAsk(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!ask) return null;

  const close = () => {
    try {
      localStorage.setItem(LATER_KEY, String(new Date().getTime()));
    } catch {}
    setAsk(false);
  };

  return (
    <div role="dialog" aria-label={t("Activer les notifications")} className="fixed inset-x-3 top-20 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-card p-4 shadow-2xl ring-1 ring-line">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-fill text-white" aria-hidden="true">
        <Bell className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("Ne ratez aucune réponse")}</p>
        <p className="mt-0.5 mb-3 text-sm text-muted">{t("Demandes, paiements, colis en route, nouveaux messages : soyez prévenu tout de suite.")}</p>
        <Button
          size="sm"
          onClick={async () => {
            setAsk(false);
            try {
              if ((await Notification.requestPermission()) === "granted") await subscribePush();
            } catch {}
          }}
        >
          {t("Activer les notifications")}
        </Button>
      </div>
      <button type="button" onClick={close} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-paper" aria-label={t("Plus tard")}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
