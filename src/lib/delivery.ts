// Livraison à domicile : service Send By Me, assuré par un partenaire de livraison à l'arrivée.
// Le prix revient à Send By Me (qui rémunère le partenaire) ; il n'entre pas dans la part du voyageur.

/** Parité fixe du franc CFA (XAF et XOF) avec l'euro. */
export const XAF_PER_EUR = 655.957;
export const xafToCents = (xaf: number) => Math.round((xaf / XAF_PER_EUR) * 100);

/**
 * Grille du partenaire KAMDEM Delivery (Cameroun), en FCFA, telle que facturée à Send By Me.
 * Jusqu'à 10 kg : au poids. Au-delà : au volume, 2 500 FCFA le premier m³ puis 1 000 FCFA par m³ supplémentaire
 * (un colis de valise tient toujours dans le premier m³).
 */
export const PARTNER_GRID_XAF = { upTo5kg: 1500, upTo10kg: 1700, firstCubicMeter: 2500, extraCubicMeter: 1000 } as const;
export const PARTNER_COUNTRIES = ["Cameroun"];

/** Coût du partenaire en FCFA pour un colis. */
export function partnerCostXaf(weightKg: number, cubicMeters = 1) {
  if (weightKg <= 5) return PARTNER_GRID_XAF.upTo5kg;
  if (weightKg <= 10) return PARTNER_GRID_XAF.upTo10kg;
  return PARTNER_GRID_XAF.firstCubicMeter + Math.max(0, Math.ceil(cubicMeters) - 1) * PARTNER_GRID_XAF.extraCubicMeter;
}

/**
 * Prix facturé à l'expéditeur : coût partenaire × coefficient de marge, arrondi à la tranche supérieure en ,90 €.
 * Les zones éloignées facturées en supplément par le partenaire se saisissent en frais annexes dans l'administration.
 */
export const DELIVERY_MARKUP = 3.5;
/** Pays sans partenaire tarifé : forfait. */
export const HOME_DELIVERY_FLAT_CENTS = 1000;

const toNinety = (cents: number) => Math.ceil((cents + 10) / 100) * 100 - 10;

export function homeDeliveryFor(country: string | null | undefined, weightKg: number) {
  if (!country || !PARTNER_COUNTRIES.includes(country)) return HOME_DELIVERY_FLAT_CENTS;
  return toNinety(xafToCents(partnerCostXaf(weightKg)) * DELIVERY_MARKUP);
}

/** Coût estimé du partenaire en centimes d'euro (pour le suivi de la marge). 0 si aucun partenaire tarifé. */
export function partnerCostCents(country: string | null | undefined, weightKg: number) {
  if (!country || !PARTNER_COUNTRIES.includes(country)) return 0;
  return xafToCents(partnerCostXaf(weightKg));
}

export type DeliveryStatus = "requested" | "scheduled" | "out_for_delivery" | "delivered" | "failed";

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  requested: "Livraison à domicile demandée",
  scheduled: "Livraison planifiée avec notre partenaire",
  out_for_delivery: "Colis remis au livreur",
  delivered: "Livré au domicile du destinataire",
  failed: "Livraison à domicile non aboutie",
};
