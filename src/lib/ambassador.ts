// Programme Ambassadeur : règles affichées aux membres. Les calculs font foi en base
// (migration ambassadors : statut, primes de palier, prime de parrainage, mise en avant).

export const AMBASSADOR_MIN_DELIVERIES = 3;
export const AMBASSADOR_MIN_RATING = 4.5;
export const FIRST_MILESTONE_CENTS = 1000; // à la 3e livraison
export const NEXT_MILESTONE_CENTS = 500; // puis toutes les 5 livraisons
export const MILESTONE_EVERY = 5;
export const AMBASSADOR_REFERRAL_CENTS = 500;
/** Mise en avant d'un trajet pour les autres voyageurs : retenue sur le premier versement du trajet. */
export const BOOST_FEE_CENTS = 100;

/** Prochain palier de livraisons qui rapporte une prime. */
export function nextMilestone(deliveries: number) {
  if (deliveries < AMBASSADOR_MIN_DELIVERIES) return AMBASSADOR_MIN_DELIVERIES;
  return deliveries + MILESTONE_EVERY - ((deliveries - AMBASSADOR_MIN_DELIVERIES) % MILESTONE_EVERY);
}

export type AmbassadorReward = {
  id: number;
  kind: "milestone" | "referral";
  amount_cents: number;
  milestone: number | null;
  created_at: string;
  paid_at: string | null;
};
