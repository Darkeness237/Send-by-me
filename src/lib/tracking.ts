// Étapes du suivi d'envoi, dans l'ordre où elles se produisent.
export const TRACKING_STEPS = [
  { kind: "requested", label: "Demande envoyée au voyageur" },
  { kind: "accepted", label: "Acceptée par le voyageur" },
  { kind: "paid", label: "Paiement sécurisé" },
  { kind: "picked_up", label: "Colis remis au voyageur" },
  { kind: "departed", label: "En route" },
  { kind: "arrived", label: "Arrivé à destination" },
  { kind: "out_for_delivery", label: "Remis au livreur pour la livraison à domicile" },
  { kind: "delivered", label: "Livré au destinataire" },
] as const;

export const TRACKING_END: Record<string, string> = {
  declined: "Demande refusée par le voyageur",
  cancelled: "Envoi annulé",
  refunded: "Envoi remboursé",
  delivery_failed: "Livraison à domicile non aboutie",
};

/** Étapes que le voyageur déclare lui-même, et celle qui doit précéder chacune. */
export const TRAVELER_STEPS = {
  departed: "picked_up",
  arrived: "departed",
  out_for_delivery: "arrived",
} as const;
export type TravelerStep = keyof typeof TRAVELER_STEPS;
