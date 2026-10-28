const TZ = "Europe/Paris";

// Dernier paramètre facultatif : la langue d'affichage (« fr » par défaut, « en » pour la version anglaise).
type Lang = "fr" | "en";
const loc = (l: Lang) => (l === "en" ? "en-GB" : "fr-FR");

// Les heures de départ s'affichent dans le fuseau de la ville de départ.

export function dayLabel(iso: string, tz = TZ, l: Lang = "fr") {
  return new Intl.DateTimeFormat(loc(l), { weekday: "short", day: "numeric", month: "short", timeZone: tz }).format(
    new Date(iso),
  );
}

export function longDate(iso: string, tz = TZ, l: Lang = "fr") {
  return new Intl.DateTimeFormat(loc(l), { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(
    new Date(iso),
  );
}

export function timeLabel(iso: string, tz = TZ, l: Lang = "fr") {
  return new Intl.DateTimeFormat(loc(l), { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
}

export function kg(n: number, l: Lang = "fr") {
  return `${Number(n).toLocaleString(loc(l), { maximumFractionDigits: 1 })} kg`;
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function memberSince(iso: string, l: Lang = "fr") {
  return new Intl.DateTimeFormat(loc(l), { month: "long", year: "numeric" }).format(new Date(iso));
}

export function isUpcoming(iso: string) {
  return new Date(iso).getTime() > Date.now();
}

/** Convertit une date et une heure locales d'un fuseau donné en instant UTC. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  const offset = (t: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date(t))
        .map((x) => [x.type, x.value]),
    );
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - t;
  };
  let t = wall - offset(wall);
  t = wall - offset(t); // second passage pour les changements d'heure
  return new Date(t);
}
