// Calcul des prix — toujours refait côté serveur, jamais lu depuis le formulaire.

export const PLATFORM_FEE_RATE = 0.12; // frais de service payés par l'expéditeur
export const MIN_FEE_CENTS = 200;

export type Quote = {
  baseCents: number; // revient au voyageur
  feeCents: number; // frais de service Send By Me
  totalCents: number; // payé par l'expéditeur
};

export function quote(pricePerKgCents: number, weightKg: number): Quote {
  const kg = Math.max(0.5, Math.round(weightKg * 2) / 2);
  const baseCents = Math.round(pricePerKgCents * kg);
  const feeCents = Math.max(MIN_FEE_CENTS, Math.round(baseCents * PLATFORM_FEE_RATE));
  return { baseCents, feeCents, totalCents: baseCents + feeCents };
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
