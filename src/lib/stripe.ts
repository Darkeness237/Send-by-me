import "server-only";

import Stripe from "stripe";

let client: Stripe | null = null;

/** Client Stripe (clé restreinte `rk_` recommandée, jamais exposée au navigateur). */
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquante");
  client ??= new Stripe(key, { appInfo: { name: "Send By Me" } });
  return client;
}

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
