"use client";

import { useEffect, useState } from "react";
import { splitCity } from "@/lib/places";

export { splitCity };

export type CityOption = { city: string; country: string; airports: { iata: string; name: string }[] };

/**
 * Suggestions de villes (toutes les villes dotées d'un aéroport) et aéroports de la ville saisie.
 * Les résultats viennent de /api/villes, avec un léger délai pour ne pas interroger à chaque touche.
 */
export function useCitySearch(value: string) {
  const [options, setOptions] = useState<CityOption[]>([]);
  const { city, country } = splitCity(value);

  useEffect(() => {
    if (city.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/villes?q=${encodeURIComponent(city)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then((list: CityOption[]) => setOptions(list))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [city]);

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const visible = city.length < 2 ? [] : options;
  const selected =
    visible.find((o) => norm(o.city) === norm(city) && (!country || norm(o.country) === norm(country))) ??
    (country ? undefined : visible.find((o) => norm(o.city) === norm(city)));
  return { options: visible, selected };
}
