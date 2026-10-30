"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent, type AnalyticsProps } from "@/lib/analytics";

/**
 * Envoie un événement Plausible à l'affichage (page de succès après une action serveur).
 * Une seule fois par onglet et par adresse : un rechargement de la page ne le compte pas deux fois.
 */
export function TrackEvent({ name, props }: { name: AnalyticsEvent; props?: AnalyticsProps }) {
  const corridor = props?.corridor;
  const methode = props?.methode;
  useEffect(() => {
    const key = `sbm-evt:${name}:${location.pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    track(name, { corridor, methode });
  }, [name, corridor, methode]);
  return null;
}

/** Bouton d'envoi d'un formulaire qui compte l'événement au clic (ex. paiement lancé vers Stripe). */
export function TrackOnSubmit({ name, props, children }: { name: AnalyticsEvent; props?: AnalyticsProps; children: React.ReactNode }) {
  return (
    <span className="contents" onClickCapture={(e) => (e.target as HTMLElement).closest("button[type=submit]") && track(name, props)}>
      {children}
    </span>
  );
}
