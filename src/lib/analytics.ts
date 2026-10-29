// Mesure d'audience Plausible : sans cookie, sans donnée personnelle.
// Ne jamais passer d'e-mail, de nom ni d'identifiant (réservation, trajet, membre) en propriété.

export type AnalyticsEvent = "Inscription" | "Trajet publié" | "Demande publiée" | "Paiement lancé" | "Livraison confirmée";
export type AnalyticsProps = { corridor?: string; methode?: "email" | "google" | "facebook" };

declare global {
  interface Window {
    plausible?: ((event: string, options?: { props?: Record<string, string>; u?: string }) => void) & { q?: unknown[] };
  }
}

/** Ligne au format « paris-douala » (minuscules, sans accents), utilisable comme propriété Plausible. */
export function corridorOf(fromCity: string, toCity: string) {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `${slug(fromCity)}-${slug(toCity)}`;
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps) {
  if (typeof window === "undefined" || !window.plausible) return;
  const clean = Object.fromEntries(Object.entries(props ?? {}).filter(([, v]) => typeof v === "string" && v.length > 0)) as Record<string, string>;
  window.plausible(event, { u: maskedUrl(location.pathname), ...(Object.keys(clean).length ? { props: clean } : {}) });
}

/**
 * Adresse envoyée à Plausible pour une page vue : chemin seul (jamais la requête, qui peut contenir un jeton),
 * identifiants et codes remplacés. Ex. /reservations/9b1f…/etiquette → /reservations/:id/etiquette
 */
export function maskedUrl(pathname: string) {
  const path = pathname
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/suivi\/[^/]+/i, "/suivi/:code")
    .replace(/SBM-[A-Z0-9]+/gi, ":code")
    .replace(/\/\d{4,}(?=\/|$)/g, "/:n");
  return `${location.origin}${path}`;
}
