// Calcul des prix — toujours refait côté serveur, jamais lu depuis le formulaire.
//
// Le voyageur fixe son prix au kilo, qui lui revient intégralement. La livraison à domicile est un service
// Send By Me (partenaire de livraison) facturé à part. L'expéditeur paie en plus des frais de service qui couvrent :
//   1. la commission Send By Me, dégressive selon le poids (plus le colis est lourd, plus le taux baisse) ;
//   2. les frais bancaires Stripe, estimés pour que la commission nette reste celle annoncée.

/** Commission selon le poids du colis. */
export const COMMISSION_TIERS = [
  { upToKg: 5, rate: 0.15 },
  { upToKg: 10, rate: 0.12 },
  { upToKg: 20, rate: 0.1 },
  { upToKg: Infinity, rate: 0.08 },
] as const;

/** Commission nette minimale par envoi : un petit colis demande autant de suivi qu'un gros. */
export const MIN_COMMISSION_CENTS = 150;

/**
 * Frais Stripe pris en compte. Valeur prudente : carte émise hors Espace économique européen
 * (3,25 % + 0,25 €). Une carte européenne coûte moins (1,5 % + 0,25 €) : la différence reste en marge.
 * À ajuster si la plupart des paiements viennent de cartes européennes.
 */
export const STRIPE_RATE = 0.0325;
export const STRIPE_FIXED_CENTS = 25;

export type Quote = {
  weightKg: number;
  baseCents: number; // transport, revient au voyageur
  deliveryCents: number; // livraison à domicile, service Send By Me
  commissionRate: number;
  commissionCents: number; // marge nette Send By Me
  processingCents: number; // frais bancaires estimés
  feeCents: number; // frais de service affichés = commission + frais bancaires
  totalCents: number; // payé par l'expéditeur
  payoutCents: number; // versé au voyageur
};

export function commissionRateFor(weightKg: number) {
  return COMMISSION_TIERS.find((t) => weightKg <= t.upToKg)!.rate;
}

export function roundKg(weightKg: number) {
  return Math.max(0.5, Math.round(weightKg * 2) / 2);
}

export function quote(pricePerKgCents: number, weightKg: number, homeDeliveryCents = 0): Quote {
  const kg = roundKg(weightKg);
  const baseCents = Math.round(pricePerKgCents * kg);
  const deliveryCents = Math.max(0, Math.round(homeDeliveryCents));
  const payoutCents = baseCents;

  const commissionRate = commissionRateFor(kg);
  const commissionCents = Math.max(MIN_COMMISSION_CENTS, Math.round(baseCents * commissionRate));

  // Total tel que, une fois les frais Stripe prélevés sur le total, il reste voyageur + livraison + commission.
  const net = baseCents + deliveryCents + commissionCents;
  const totalCents = Math.ceil((net + STRIPE_FIXED_CENTS) / (1 - STRIPE_RATE) / 10) * 10; // arrondi aux 10 centimes
  const feeCents = totalCents - baseCents - deliveryCents;
  return {
    weightKg: kg,
    baseCents,
    deliveryCents,
    commissionRate,
    commissionCents,
    processingCents: feeCents - commissionCents,
    feeCents,
    totalCents,
    payoutCents,
  };
}

export function euros(cents: number, opts: { decimals?: boolean } = {}) {
  const decimals = opts.decimals ?? cents % 100 !== 0;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(cents / 100);
}

export function percent(rate: number) {
  return `${Math.round(rate * 100)} %`;
}
