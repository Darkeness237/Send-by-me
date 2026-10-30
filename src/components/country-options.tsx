import { COUNTRIES, TOP_COUNTRIES, countryByName } from "@/lib/countries";

const top = TOP_COUNTRIES.map((n) => countryByName(n)!);
const others = COUNTRIES.filter((c) => !TOP_COUNTRIES.includes(c.fr));

/**
 * Tous les pays du monde pour un <select>, lignes principales en tête. La valeur enregistrée est le nom français.
 * `dial` : valeur = indicatif (« +237 ») et libellé « +237 Cameroun ».
 */
export function CountryOptions({ lang, dial = false }: { lang: string; dial?: boolean }) {
  const label = (c: (typeof COUNTRIES)[number]) => `${dial ? `${c.dial} ` : ""}${lang === "en" ? c.en : c.fr}`;
  const option = (c: (typeof COUNTRIES)[number]) => (
    <option key={c.iso} value={dial ? `${c.dial}|${c.iso}` : c.fr}>
      {label(c)}
    </option>
  );
  return (
    <>
      <optgroup label={lang === "en" ? "Most chosen" : "Les plus choisis"}>{top.map(option)}</optgroup>
      <optgroup label={lang === "en" ? "All countries" : "Tous les pays"}>{others.map(option)}</optgroup>
    </>
  );
}
