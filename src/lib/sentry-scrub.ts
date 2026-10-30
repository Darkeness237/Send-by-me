// Filtre appliqué à chaque événement Sentry (client, serveur, edge) avant envoi :
// e-mails, téléphones, IBAN et codes de remise (6 chiffres) sont masqués partout où ils peuvent apparaître.
import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

const PATTERNS: [RegExp, string][] = [
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]"],
  [/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,3})?\b/g, "[iban]"],
  [/(?:\+|00)\d[\d ().-]{7,17}\d/g, "[téléphone]"],
  [/\b0[1-9](?:[ .-]?\d{2}){4}\b/g, "[téléphone]"],
  [/\b6\d{8}\b/g, "[téléphone]"], // mobile camerounais sans indicatif
  [/\b\d{3}[ ]?\d{3}\b/g, "[code]"], // code de remise à 6 chiffres
];

const SENSITIVE_KEYS = /^(email|e-mail|mail|phone|telephone|téléphone|mobile|mobile_number|recipient_phone|recipient_email|iban|bic|code|delivery_code|password|token|token_hash|authorization|cookie|address|delivery_address)$/i;

export function scrubText(value: string) {
  return PATTERNS.reduce((s, [re, label]) => s.replace(re, label), value);
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE_KEYS.test(k) ? "[filtré]" : scrub(v, depth + 1)]));
  }
  return value;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent | null {
  if (event.message) event.message = scrubText(event.message);
  for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = scrubText(ex.value);
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      for (const h of Object.keys(event.request.headers)) if (/cookie|authorization|x-forwarded-for|x-real-ip/i.test(h)) delete event.request.headers[h];
    }
    // Requête retirée : elle peut porter un jeton (lien de confirmation) ou un code.
    if (event.request.url) event.request.url = scrubText(event.request.url.split("?")[0]);
    delete event.request.query_string;
  }
  if (event.extra) event.extra = scrub(event.extra) as typeof event.extra;
  if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;
  if (event.tags) event.tags = scrub(event.tags) as typeof event.tags;
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb).filter(Boolean) as Breadcrumb[];
  delete event.user;
  return event;
}

export function scrubBreadcrumb(b: Breadcrumb): Breadcrumb | null {
  if (b.message) b.message = scrubText(b.message);
  if (b.data) {
    const data = scrub(b.data) as Record<string, unknown>;
    for (const k of ["url", "to", "from"]) if (typeof data[k] === "string") data[k] = (data[k] as string).split("?")[0];
    b.data = data;
  }
  return b;
}

/** Réglages communs aux trois environnements d'exécution. */
export const sentryBase = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.CONTEXT ?? process.env.NODE_ENV, // CONTEXT : production / deploy-preview sur Netlify
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
} as const;
