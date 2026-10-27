// Livraison à domicile : service Send By Me, assuré par un partenaire de livraison à l'arrivée.
// Le forfait revient à Send By Me (qui rémunère le partenaire) ; il n'entre pas dans la part du voyageur.

/** Forfait facturé à l'expéditeur. À ajuster selon le tarif du partenaire (par pays si besoin). */
export const HOME_DELIVERY_CENTS = 1000;

export function homeDeliveryFor(_country?: string | null) {
  return HOME_DELIVERY_CENTS;
}

export type DeliveryStatus = "requested" | "scheduled" | "out_for_delivery" | "delivered" | "failed";

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  requested: "Livraison à domicile demandée",
  scheduled: "Livraison planifiée avec notre partenaire",
  out_for_delivery: "Colis remis au livreur",
  delivered: "Livré au domicile du destinataire",
  failed: "Livraison à domicile non aboutie",
};
