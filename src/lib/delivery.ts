// Livraison à domicile : service Send By Me, assuré par un partenaire de livraison à l'arrivée.
// Le prix revient à Send By Me (qui rémunère le partenaire) ; il n'entre pas dans la part du voyageur.

/** Parité fixe du franc CFA (XAF et XOF) avec l'euro. */
export const XAF_PER_EUR = 655.957;
export const xafToCents = (xaf: number) => Math.round((xaf / XAF_PER_EUR) * 100);

/**
 * Grille du partenaire KAMDEM Delivery (Cameroun), en FCFA, telle que facturée à Send By Me.
 * « Facturation au poids » jusqu'à 10 kg ; « facturation au volume » au-delà de 10 kg ou pour un colis encombrant
 * (volume important même s'il est léger) : 2 500 FCFA le premier m³, puis 1 000 FCFA par m³ supplémentaire.
 */
export const PARTNER_GRID_XAF = { upTo5kg: 1500, upTo10kg: 1700, firstCubicMeter: 2500, extraCubicMeter: 1000 } as const;
export const PARTNER_COUNTRIES = ["Cameroun"];

/** Coût du partenaire en FCFA pour un colis (un colis de valise tient toujours dans le premier m³). */
export function partnerCostXaf(weightKg: number, bulky = false, cubicMeters = 1) {
  if (bulky || weightKg > 10) return PARTNER_GRID_XAF.firstCubicMeter + Math.max(0, Math.ceil(cubicMeters) - 1) * PARTNER_GRID_XAF.extraCubicMeter;
  return weightKg <= 5 ? PARTNER_GRID_XAF.upTo5kg : PARTNER_GRID_XAF.upTo10kg;
}

/**
 * Prix facturé à l'expéditeur (pays avec partenaire tarifé) :
 * – jusqu'à 5 kg : coût partenaire × 2, marge volontairement modérée ;
 * – de 5 à 10 kg : coût partenaire × 3 ;
 * – colis encombrant ou une valise (jusqu'à 23 kg) : 9,99 € ;
 * – deux valises ou plus : 12,99 €, plafond quel que soit le nombre de valises.
 * Arrondi à la tranche supérieure en ,90 €. Les suppléments du partenaire (zones éloignées) se saisissent en frais annexes.
 */
export const MARKUP_UP_TO_5KG = 2;
export const MARKUP_UP_TO_10KG = 3;
export const SUITCASE_KG = 23;
export const ONE_SUITCASE_CENTS = 999;
export const DELIVERY_CAP_CENTS = 1299;

const toNinety = (cents: number) => Math.ceil((cents + 10) / 100) * 100 - 10;
export const suitcasesFor = (weightKg: number) => Math.max(1, Math.ceil(weightKg / SUITCASE_KG));

/** Livraison à domicile proposée seulement là où un partenaire livre (Cameroun pour l'instant). */
export const homeDeliveryAvailable = (country: string | null | undefined) => Boolean(country && PARTNER_COUNTRIES.includes(country));

export function homeDeliveryFor(country: string | null | undefined, weightKg: number, bulky = false) {
  if (!homeDeliveryAvailable(country)) return 0;
  let cents: number;
  if (weightKg > 10) cents = suitcasesFor(weightKg) === 1 ? ONE_SUITCASE_CENTS : DELIVERY_CAP_CENTS;
  else if (bulky) cents = ONE_SUITCASE_CENTS;
  else cents = toNinety(xafToCents(partnerCostXaf(weightKg)) * (weightKg <= 5 ? MARKUP_UP_TO_5KG : MARKUP_UP_TO_10KG));
  return Math.min(cents, DELIVERY_CAP_CENTS);
}

/** Coût estimé du partenaire en centimes d'euro (pour le suivi de la marge). 0 si aucun partenaire tarifé. */
export function partnerCostCents(country: string | null | undefined, weightKg: number, bulky = false) {
  if (!country || !PARTNER_COUNTRIES.includes(country)) return 0;
  return xafToCents(partnerCostXaf(weightKg, bulky));
}

export type DeliveryStatus = "requested" | "scheduled" | "out_for_delivery" | "delivered" | "failed";

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  requested: "Livraison à domicile demandée",
  scheduled: "Livraison planifiée avec notre partenaire",
  out_for_delivery: "Colis remis au livreur",
  delivered: "Livré au domicile du destinataire",
  failed: "Livraison à domicile non aboutie",
};
