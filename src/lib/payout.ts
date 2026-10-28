// Moyens de versement des voyageurs : virement bancaire (IBAN) ou Mobile Money.

export type PayoutMethod = {
  kind: "iban" | "mobile_money";
  holder_name: string;
  iban: string | null;
  bic: string | null;
  mobile_operator: string | null;
  mobile_number: string | null;
  country: string | null;
  updated_at: string;
};

export const MOBILE_OPERATORS = [
  { id: "orange", label: "Orange Money" },
  { id: "mtn", label: "MTN Mobile Money" },
  { id: "wave", label: "Wave" },
  { id: "moov", label: "Moov Money" },
  { id: "airtel", label: "Airtel Money" },
  { id: "free", label: "Free Money" },
  { id: "autre", label: "Autre opérateur" },
] as const;

export const cleanIban = (v: string) => v.replace(/\s+/g, "").toUpperCase();

/** Contrôle officiel de l'IBAN (ISO 13616) : lettres converties en chiffres, reste de la division par 97 égal à 1. */
export function isValidIban(raw: string) {
  const iban = cleanIban(raw);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}

/** IBAN groupé par 4, pour la saisie et l'administration. */
export const formatIban = (iban: string) => cleanIban(iban).replace(/(.{4})/g, "$1 ").trim();

/** Affiché au membre : seuls le pays et les 4 derniers caractères restent visibles. */
export const maskIban = (iban: string) => {
  const v = cleanIban(iban);
  return `${v.slice(0, 4)} •••• •••• ${v.slice(-4)}`;
};

export const maskPhone = (phone: string) => `${phone.slice(0, 4)} •• •• ${phone.slice(-2)}`;

export const operatorLabel = (id: string | null) => MOBILE_OPERATORS.find((o) => o.id === id)?.label ?? id ?? "";
