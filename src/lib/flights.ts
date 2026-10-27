import type { TransportCheck, TransportCheckNote } from "@/lib/types";

// Compagnies présentes sur les lignes Europe ↔ Afrique desservies (code IATA → nom).
export const AIRLINES: { code: string; name: string }[] = [
  { code: "AF", name: "Air France" },
  { code: "SN", name: "Brussels Airlines" },
  { code: "AT", name: "Royal Air Maroc" },
  { code: "ET", name: "Ethiopian Airlines" },
  { code: "TK", name: "Turkish Airlines" },
  { code: "KQ", name: "Kenya Airways" },
  { code: "QC", name: "Camair-Co" },
  { code: "HF", name: "Air Côte d'Ivoire" },
  { code: "HC", name: "Air Sénégal" },
  { code: "KP", name: "ASKY Airlines" },
  { code: "SS", name: "Corsair" },
  { code: "TO", name: "Transavia France" },
  { code: "TU", name: "Tunisair" },
  { code: "AH", name: "Air Algérie" },
  { code: "MS", name: "EgyptAir" },
  { code: "WB", name: "RwandAir" },
  { code: "DT", name: "TAAG Angola Airlines" },
  { code: "TP", name: "TAP Air Portugal" },
  { code: "IB", name: "Iberia" },
  { code: "UX", name: "Air Europa" },
  { code: "LH", name: "Lufthansa" },
  { code: "KL", name: "KLM" },
  { code: "LX", name: "Swiss" },
  { code: "AZ", name: "ITA Airways" },
  { code: "EK", name: "Emirates" },
  { code: "QR", name: "Qatar Airways" },
  { code: "U2", name: "easyJet" },
  { code: "FR", name: "Ryanair" },
  { code: "V7", name: "Volotea" },
  { code: "BA", name: "British Airways" },
];

export function airlineName(code: string | null | undefined) {
  return AIRLINES.find((a) => a.code === code)?.name ?? code ?? "";
}

/** « af 946 » → « AF946 ». */
export function normalizeFlightNumber(raw: string) {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

export const FLIGHT_NUMBER_RE = /^[A-Z0-9]{2}\d{1,4}[A-Z]?$/;

export type FlightInput = {
  carrier: string;
  flightNumber: string;
  fromCity: string;
  toCity: string;
  fromAirports: string[]; // aéroports de la ville de départ
  toAirports: string[];
  fromAirport: string;
  toAirport: string;
  hasStopover: boolean;
  departureUtc: Date;
};

export type FlightCheckResult = {
  status: TransportCheck;
  notes: TransportCheckNote[];
  inputError: string | null; // incohérence de saisie : la publication est refusée
};

/**
 * Contrôles automatiques à la publication. Une incohérence de saisie bloque l'annonce ;
 * un vol introuvable dans les horaires ne la bloque pas, mais elle est signalée aux expéditeurs et à l'équipe.
 * Si une clé AeroDataBox est configurée, le vol est aussi recherché dans les horaires réels.
 */
export async function checkFlight(input: FlightInput): Promise<FlightCheckResult> {
  const notes: TransportCheckNote[] = [];
  const airline = AIRLINES.find((a) => a.code === input.carrier);
  notes.push({ ok: !!airline, label: airline ? `Compagnie reconnue : ${airline.name}` : "Compagnie inconnue" });

  const formatOk = FLIGHT_NUMBER_RE.test(input.flightNumber);
  notes.push({ ok: formatOk, label: formatOk ? `Numéro de vol au bon format (${input.flightNumber})` : "Numéro de vol mal formé" });

  const prefixOk = input.flightNumber.startsWith(input.carrier);
  notes.push({ ok: prefixOk, label: prefixOk ? "Le numéro de vol correspond à la compagnie" : "Le numéro de vol ne correspond pas à la compagnie" });

  const fromOk = input.fromAirports.includes(input.fromAirport);
  notes.push({ ok: fromOk, label: fromOk ? `Départ de ${input.fromAirport}, cohérent avec ${input.fromCity}` : `L'aéroport ${input.fromAirport} ne dessert pas ${input.fromCity}` });

  const toOk = input.toAirports.includes(input.toAirport);
  notes.push({ ok: toOk, label: toOk ? `Arrivée à ${input.toAirport}, cohérente avec ${input.toCity}` : `L'aéroport ${input.toAirport} ne dessert pas ${input.toCity}` });

  const basicOk = notes.every((n) => n.ok);
  const live = basicOk ? await lookupFlight(input) : null;
  if (live) notes.push(live);

  const status: TransportCheck = !basicOk || live?.ok === false ? "mismatch" : live?.ok ? "confirmed" : "consistent";
  return { status, notes, inputError: basicOk ? null : notes.find((n) => !n.ok)!.label };
}

/** Recherche du vol dans les horaires réels (AeroDataBox via RapidAPI). Renvoie null si indisponible. */
async function lookupFlight(input: FlightInput): Promise<TransportCheckNote | null> {
  const key = process.env.AERODATABOX_API_KEY;
  if (!key) return null;
  const date = input.departureUtc.toISOString().slice(0, 10);
  try {
    const res = await fetch(
      `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(input.flightNumber)}/${date}?withAircraftImage=false&withLocation=false`,
      {
        headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com" },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      },
    );
    if (res.status === 204 || res.status === 404) {
      return { ok: false, label: `Vol ${input.flightNumber} introuvable dans les horaires du ${date}` };
    }
    if (!res.ok) return null;
    const flights = (await res.json()) as {
      departure?: { airport?: { iata?: string }; scheduledTime?: { utc?: string } };
      arrival?: { airport?: { iata?: string } };
    }[];
    const match = flights.find((f) => f.departure?.airport?.iata === input.fromAirport);
    if (!match) return { ok: false, label: `Le vol ${input.flightNumber} ne part pas de ${input.fromAirport} ce jour-là` };
    const scheduled = match.departure?.scheduledTime?.utc ? new Date(match.departure.scheduledTime.utc.replace(" ", "T")) : null;
    const gapH = scheduled ? Math.abs(scheduled.getTime() - input.departureUtc.getTime()) / 3600_000 : 0;
    if (scheduled && gapH > 3) return { ok: false, label: `L'heure annoncée diffère de l'horaire du vol (${Math.round(gapH)} h d'écart)` };
    return { ok: true, label: `Vol ${input.flightNumber} trouvé dans les horaires réels` };
  } catch {
    return null;
  }
}

export const TRANSPORT_CHECK_LABEL: Record<TransportCheck, string> = {
  unchecked: "Non contrôlé",
  consistent: "Informations de vol cohérentes",
  confirmed: "Vol confirmé dans les horaires",
  mismatch: "Informations de vol à vérifier",
};
