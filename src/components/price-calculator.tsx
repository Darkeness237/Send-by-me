"use client";

import { useState } from "react";
import { ArrowRight, Calculator } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { priceGuide, type MarketPrice } from "@/lib/price-guide";
import { PLACES } from "@/lib/places";
import { euros, quote } from "@/lib/pricing";

/** Estimation instantanée : fourchette tout compris (prix conseillé au kilo + frais de service). */
export function PriceCalculator({ market }: { market: MarketPrice[] }) {
  const [from, setFrom] = useState("Paris");
  const [to, setTo] = useState("Douala");
  const [weight, setWeight] = useState(5);
  const kg = Math.min(30, Math.max(0.5, Number(weight) || 0.5));
  const guide = priceGuide(from, to, "plane", market);
  const low = quote(guide.lowCents, kg);
  const high = quote(guide.highCents, kg);
  const href = `/recherche?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&kg=${kg}`;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-[var(--shadow-tag)] ring-1 ring-line sm:p-8">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Calculator className="h-5 w-5 text-brand" aria-hidden="true" /> Combien coûte mon envoi ?
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
        <label className="text-sm font-semibold">
          Départ
          <Select value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1">
            {PLACES.map((p) => (
              <option key={p.slug} value={p.city}>
                {p.city} ({p.code})
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-semibold">
          Arrivée
          <Select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1">
            {PLACES.map((p) => (
              <option key={p.slug} value={p.city}>
                {p.city} ({p.code})
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-semibold">
          Poids (kg)
          <Input type="number" min={0.5} max={30} step={0.5} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="mt-1" />
        </label>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-paper p-5" aria-live="polite">
        <div>
          <p className="text-sm text-muted">Estimation tout compris pour {kg.toLocaleString("fr-FR")} kg</p>
          <p className="wide tabular mt-1 text-3xl font-extrabold text-ink">
            {euros(low.totalCents)} à {euros(high.totalCents)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Prix des voyageurs {guide.source === "market" ? "observé sur cette ligne" : "conseillé"} ({euros(guide.lowCents)} à {euros(guide.highCents)} le kilo), frais de service inclus.
          </p>
        </div>
        <ButtonLink href={href} size="lg">
          Voir les trajets <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    </div>
  );
}
