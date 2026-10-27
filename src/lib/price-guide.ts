import { findPlace, normalize } from "@/lib/places";
import type { TripMode } from "@/lib/types";

// Prix conseillé au kilo, à la manière de BlaBlaCar : il guide le voyageur pour que le total payé
// par l'expéditeur (prix + frais de service) reste attractif. Au-dessus du plafond, l'annonce est refusée.
// Le voyageur ne voit que ce qu'il reçoit, jamais le montant payé par l'expéditeur.

/** Statistiques observées sur une ligne : médiane des prix au kilo publiés récemment. */
export type MarketPrice = { from: string; to: string; mode: TripMode; medianCents: number; count: number };

export type PriceGuide = {
  lowCents: number;
  highCents: number;
  maxCents: number; // plafond accepté
  source: "market" | "default";
  sample: number;
};

/** Nombre d'annonces nécessaires pour se fier aux prix observés sur la ligne. */
const MIN_SAMPLE = 3;

const EUROPE = new Set(["France", "Belgique"]);

/** Fourchettes par défaut, quand la ligne n'a pas encore assez d'annonces. */
function defaultRange(from: string, to: string, mode: TripMode) {
  const a = findPlace(from)?.country;
  const b = findPlace(to)?.country;
  const sameContinent = !!a && !!b && EUROPE.has(a) === EUROPE.has(b);
  if (mode !== "plane") return sameContinent ? { low: 300, high: 600 } : { low: 500, high: 900 };
  return sameContinent ? { low: 500, high: 800 } : { low: 700, high: 1100 };
}

const roundTo50 = (cents: number) => Math.round(cents / 50) * 50;

export function marketKey(from: string, to: string, mode: TripMode) {
  return `${normalize(from)}|${normalize(to)}|${mode}`;
}

export function priceGuide(from: string, to: string, mode: TripMode, market: MarketPrice[] = []): PriceGuide {
  const m = market.find((x) => marketKey(x.from, x.to, x.mode) === marketKey(from, to, mode));
  if (m && m.count >= MIN_SAMPLE) {
    const low = roundTo50(m.medianCents * 0.85);
    const high = roundTo50(m.medianCents * 1.15);
    return { lowCents: low, highCents: high, maxCents: roundTo50(high * 1.5), source: "market", sample: m.count };
  }
  const { low, high } = defaultRange(from, to, mode);
  return { lowCents: low, highCents: high, maxCents: roundTo50(high * 1.5), source: "default", sample: m?.count ?? 0 };
}

export type PriceLevel = "attractive" | "fair" | "high" | "over";

export function priceLevel(priceCents: number, g: PriceGuide): PriceLevel {
  if (priceCents > g.maxCents) return "over";
  if (priceCents > g.highCents) return "high";
  if (priceCents < g.lowCents) return "attractive";
  return "fair";
}

/** Médiane des prix au kilo par ligne, à partir d'annonces (calcul côté serveur). */
export function computeMarket(rows: { from_city: string; to_city: string; mode: TripMode; price_per_kg_cents: number }[]): MarketPrice[] {
  const groups = new Map<string, { from: string; to: string; mode: TripMode; prices: number[] }>();
  for (const r of rows) {
    const k = marketKey(r.from_city, r.to_city, r.mode);
    const g = groups.get(k) ?? { from: r.from_city, to: r.to_city, mode: r.mode, prices: [] };
    g.prices.push(r.price_per_kg_cents);
    groups.set(k, g);
  }
  return [...groups.values()].map((g) => {
    const s = g.prices.sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    const median = s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
    return { from: g.from, to: g.to, mode: g.mode, medianCents: median, count: s.length };
  });
}
