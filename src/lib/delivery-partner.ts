import "server-only";

import { timingSafeEqual } from "node:crypto";

// Partenaire de livraison à domicile. Tant que DELIVERY_PARTNER_API_URL et DELIVERY_PARTNER_API_KEY
// ne sont pas renseignées, les livraisons restent « demandées » et l'équipe les suit depuis l'administration.

export const isPartnerConfigured = Boolean(process.env.DELIVERY_PARTNER_API_URL && process.env.DELIVERY_PARTNER_API_KEY);

export type PartnerDeliveryRequest = {
  trackingCode: string;
  city: string;
  country: string;
  address: string;
  recipientName: string;
  recipientPhone: string;
  weightKg: number;
  expectedAt: string | null; // arrivée prévue du voyageur
};

/** Crée la course chez le partenaire. Renvoie sa référence, ou null si le partenaire n'est pas configuré ou refuse. */
export async function requestPartnerDelivery(req: PartnerDeliveryRequest): Promise<string | null> {
  if (!isPartnerConfigured) return null;
  try {
    const res = await fetch(`${process.env.DELIVERY_PARTNER_API_URL!.replace(/\/$/, "")}/deliveries`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.DELIVERY_PARTNER_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": req.trackingCode },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => ({}))) as { id?: string; reference?: string };
    return body.id ?? body.reference ?? req.trackingCode;
  } catch {
    return null;
  }
}

/** Vérifie l'appel entrant du partenaire (en-tête Authorization: Bearer <DELIVERY_PARTNER_WEBHOOK_SECRET>). */
export function isPartnerWebhookAuthorized(header: string | null) {
  const secret = process.env.DELIVERY_PARTNER_WEBHOOK_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
