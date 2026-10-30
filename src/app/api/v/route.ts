import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Robots, aperçus de liens et outils de test : non comptés.
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|monitor|curl|wget|python|node-fetch/i;
const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|qwant|ecosia)\./;

/** D'où vient le visiteur : domaine lisible (Google, Instagram…) ou null pour un accès direct. */
function sourceOf(ref: string | null, host: string | null) {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (!h || (host && h === host.replace(/^www\./, ""))) return null;
    if (SEARCH.test(h)) return "Google et moteurs";
    if (/instagram/.test(h)) return "Instagram";
    if (/facebook|fb\.com|m\.me/.test(h)) return "Facebook";
    if (/tiktok/.test(h)) return "TikTok";
    if (/whatsapp|wa\.me/.test(h)) return "WhatsApp";
    if (/t\.co|twitter|x\.com/.test(h)) return "X";
    if (/linkedin/.test(h)) return "LinkedIn";
    return h.slice(0, 60);
  } catch {
    return null;
  }
}

/**
 * Compte une page vue. Aucun cookie : le visiteur est une empreinte (adresse IP + navigateur + jour)
 * passée au hachage avec un secret serveur. Elle change chaque jour et ne permet pas d'identifier qui que ce soit.
 */
export async function POST(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });
  let body: { path?: unknown; ref?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }
  const path = typeof body.path === "string" ? body.path.split("?")[0].slice(0, 200) : "";
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return new Response(null, { status: 204 });

  const ip = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const day = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const salt = (process.env.SUPABASE_SECRET_KEY ?? "").slice(-16);
  const visitor = createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("hex").slice(0, 24);
  const device = /mobi|android|iphone|ipad/i.test(ua) ? "mobile" : "ordinateur";
  const source = sourceOf(typeof body.ref === "string" ? body.ref : null, request.headers.get("host"));

  await createAdminClient().from("site_visits").insert({ day, path, visitor, device, source });
  return new Response(null, { status: 204 });
}
