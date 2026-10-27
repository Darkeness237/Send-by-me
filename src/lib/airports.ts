import "server-only";

import data from "@/data/airports.json";
import { findPlace, normalize as baseNormalize } from "@/lib/places";

/** Clé de recherche : sans accents, tirets ni apostrophes (« Pointe-Noire » = « Pointe Noire »). */
const normalize = (s: string) => baseNormalize(s).replace(/[-'’.]/g, " ").replace(/\s+/g, " ").trim();

// Base mondiale des aéroports à code IATA (mwgg/Airports, licence MIT), réduite à
// [code, nom, ville, pays ISO, fuseau]. Utilisée côté serveur uniquement (≈ 500 Ko).
type Row = [iata: string, name: string, city: string, country: string, tz: string];
const ROWS = data as Row[];

export type Airport = { iata: string; name: string };
export type City = { city: string; country: string; countryCode: string; tz: string; airports: Airport[] };

const countryName = new Intl.DisplayNames(["fr"], { type: "region" });

/** Noms français → nom utilisé dans la base. */
const ALIASES: Record<string, string> = {
  bruxelles: "brussels",
  londres: "london",
  geneve: "geneva",
  lisbonne: "lisbon",
  barcelone: "barcelona",
  seville: "sevilla",
  varsovie: "warsaw",
  vienne: "vienna",
  francfort: "frankfurt",
  hambourg: "hamburg",
  cologne: "cologne",
  munich: "munich",
  bale: "basel",
  anvers: "antwerp",
  moscou: "moscow",
  pekin: "beijing",
  "le caire": "cairo",
  alger: "algiers",
  "le cap": "cape town",
  johannesbourg: "johannesburg",
  "addis-abeba": "addis ababa",
  "addis abeba": "addis ababa",
  "new york": "new york",
  "n'djamena": "n'djamena",
  ndjamena: "n'djamena",
  "la mecque": "jeddah",
  dubai: "dubai",
  stockholm: "stockholm",
  copenhague: "copenhagen",
  athenes: "athens",
  bucarest: "bucharest",
  prague: "prague",
  edimbourg: "edinburgh",
  venise: "venice",
  naples: "naples",
  florence: "florence",
};

/** Aéroports à rattacher à une ville en plus de ceux de la base (noms de ville mal renseignés). */
const EXTRA: Record<string, { country: string; codes: string[] }[]> = {
  paris: [{ country: "FR", codes: ["CDG", "ORY", "BVA"] }],
  dakar: [{ country: "SN", codes: ["DSS"] }],
  bamako: [{ country: "ML", codes: ["BKO"] }],
  toulouse: [{ country: "FR", codes: ["TLS"] }],
  beauvais: [{ country: "FR", codes: ["BVA"] }],
};

/** Index : ville normalisée → villes (une par pays). */
const INDEX = (() => {
  const byKey = new Map<string, Map<string, City>>();
  const byCode = new Map(ROWS.map((r) => [r[0], r]));
  const add = (key: string, display: string, r: Row) => {
    const perCountry = byKey.get(key) ?? new Map<string, City>();
    const c = perCountry.get(r[3]) ?? { city: display, country: countryName.of(r[3]) ?? r[3], countryCode: r[3], tz: r[4], airports: [] };
    if (!c.airports.some((a) => a.iata === r[0])) c.airports.push({ iata: r[0], name: r[1] });
    perCountry.set(r[3], c);
    byKey.set(key, perCountry);
  };
  for (const r of ROWS) {
    const display = r[2].split("/")[0].trim();
    add(normalize(display), display, r);
  }
  for (const [key, groups] of Object.entries(EXTRA)) {
    for (const g of groups) {
      for (const code of g.codes) {
        const r = byCode.get(code);
        if (r) add(key, key.charAt(0).toUpperCase() + key.slice(1), [r[0], r[1], r[2], g.country, r[4]]);
      }
    }
  }
  // Ordre : aéroports principaux connus d'abord, bases militaires et héliports en dernier.
  for (const perCountry of byKey.values()) {
    for (const c of perCountry.values()) {
      const main = EXTRA[normalize(c.city)]?.find((g) => g.country === c.countryCode)?.codes ?? [];
      c.airports.sort((a, b) => {
        const ia = main.indexOf(a.iata), ib = main.indexOf(b.iata);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        return Number(/air base|military|heliport/i.test(a.name)) - Number(/air base|military|heliport/i.test(b.name));
      });
    }
  }
  return byKey;
})();

function keyFor(city: string) {
  const k = normalize(city);
  return ALIASES[k] ? normalize(ALIASES[k]) : k;
}

/** Nom français d'une ville quand il diffère de la base (Brussels → Bruxelles). */
const FRENCH = new Map(Object.entries(ALIASES).map(([fr, en]) => [normalize(en), fr]));
function frenchName(c: City): City {
  const known = findPlace(c.city);
  if (known && normalize(known.country) === normalize(c.country)) return { ...c, city: known.city };
  const fr = FRENCH.get(normalize(c.city));
  if (!fr || fr === normalize(c.city)) return c;
  return { ...c, city: fr.replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase()) };
}

/** Villes correspondant à une saisie, les plus grandes (le plus d'aéroports) d'abord. */
export function searchCities(query: string, limit = 8): City[] {
  const q = keyFor(query);
  if (q.length < 2) return [];
  const exact = [...(INDEX.get(q)?.values() ?? [])];
  const prefix: City[] = [];
  for (const [key, perCountry] of INDEX) {
    if (key !== q && key.startsWith(q)) prefix.push(...perCountry.values());
    if (prefix.length > 200) break;
  }
  const rank = (c: City) => -c.airports.length;
  return [...exact.sort((a, b) => rank(a) - rank(b)), ...prefix.sort((a, b) => rank(a) - rank(b))].slice(0, limit).map(frenchName);
}

/** La ville choisie (et son pays, s'il est connu) ; la plus grande homonyme sinon. */
export function findCity(city: string, countryHint?: string | null): City | undefined {
  const perCountry = INDEX.get(keyFor(city));
  if (!perCountry) return undefined;
  const all = [...perCountry.values()];
  if (countryHint) {
    const h = normalize(countryHint);
    const match = all.find((c) => normalize(c.country) === h || normalize(c.countryCode) === h);
    if (match) return frenchName(match);
  }
  const best = all.sort((a, b) => b.airports.length - a.airports.length)[0];
  return best && frenchName(best);
}

export function airportsForCity(city: string, countryHint?: string | null): string[] {
  return findCity(city, countryHint)?.airports.map((a) => a.iata) ?? [];
}
