export type Place = { city: string; country: string; code: string; slug: string; tz: string };

// Villes desservies au lancement : la diaspora France / Belgique ↔ Afrique francophone.
export const PLACES: Place[] = [
  { city: "Paris", country: "France", code: "CDG", slug: "paris", tz: "Europe/Paris" },
  { city: "Lyon", country: "France", code: "LYS", slug: "lyon", tz: "Europe/Paris" },
  { city: "Marseille", country: "France", code: "MRS", slug: "marseille", tz: "Europe/Paris" },
  { city: "Bordeaux", country: "France", code: "BOD", slug: "bordeaux", tz: "Europe/Paris" },
  { city: "Lille", country: "France", code: "LIL", slug: "lille", tz: "Europe/Paris" },
  { city: "Toulouse", country: "France", code: "TLS", slug: "toulouse", tz: "Europe/Paris" },
  { city: "Bruxelles", country: "Belgique", code: "BRU", slug: "bruxelles", tz: "Europe/Brussels" },
  { city: "Douala", country: "Cameroun", code: "DLA", slug: "douala", tz: "Africa/Douala" },
  { city: "Yaoundé", country: "Cameroun", code: "NSI", slug: "yaounde", tz: "Africa/Douala" },
  { city: "Dakar", country: "Sénégal", code: "DSS", slug: "dakar", tz: "Africa/Dakar" },
  { city: "Abidjan", country: "Côte d'Ivoire", code: "ABJ", slug: "abidjan", tz: "Africa/Abidjan" },
  { city: "Libreville", country: "Gabon", code: "LBV", slug: "libreville", tz: "Africa/Libreville" },
  { city: "Kinshasa", country: "RD Congo", code: "FIH", slug: "kinshasa", tz: "Africa/Kinshasa" },
  { city: "Brazzaville", country: "Congo", code: "BZV", slug: "brazzaville", tz: "Africa/Brazzaville" },
  { city: "Lomé", country: "Togo", code: "LFW", slug: "lome", tz: "Africa/Lome" },
  { city: "Cotonou", country: "Bénin", code: "COO", slug: "cotonou", tz: "Africa/Porto-Novo" },
  { city: "Bamako", country: "Mali", code: "BKO", slug: "bamako", tz: "Africa/Bamako" },
  { city: "Casablanca", country: "Maroc", code: "CMN", slug: "casablanca", tz: "Africa/Casablanca" },
];

export function findPlace(cityOrSlug: string | null | undefined): Place | undefined {
  if (!cityOrSlug) return undefined;
  const q = normalize(cityOrSlug);
  return PLACES.find((p) => p.slug === q || normalize(p.city) === q || p.code.toLowerCase() === q);
}

/** Fuseau horaire d'une ville (Paris par défaut). */
export function tzFor(city: string): string {
  return findPlace(city)?.tz ?? "Europe/Paris";
}

export function codeFor(city: string): string {
  return findPlace(city)?.code ?? city.slice(0, 3).toUpperCase();
}

export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// Corridors mis en avant (pages SEO /envoyer-un-colis/[corridor])
export const CORRIDORS: Array<[string, string]> = [
  ["paris", "douala"],
  ["paris", "yaounde"],
  ["paris", "dakar"],
  ["paris", "abidjan"],
  ["bruxelles", "kinshasa"],
  ["lyon", "douala"],
  ["marseille", "dakar"],
  ["paris", "libreville"],
  ["douala", "paris"],
  ["dakar", "paris"],
  ["abidjan", "paris"],
  ["paris", "lome"],
];

export function corridorSlug(from: string, to: string) {
  return `${from}-${to}`;
}

export function parseCorridor(slug: string): [Place, Place] | null {
  for (const [a, b] of CORRIDORS) {
    if (corridorSlug(a, b) === slug) {
      const from = findPlace(a);
      const to = findPlace(b);
      if (from && to) return [from, to];
    }
  }
  return null;
}
