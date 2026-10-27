import { searchCities } from "@/lib/airports";

/** Autocomplétion des villes (avec leurs aéroports) pour la publication de trajet. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.slice(0, 60) ?? "";
  const cities = searchCities(q, 8).map((c) => ({ city: c.city, country: c.country, airports: c.airports.slice(0, 8) }));
  // Le cache du navigateur suffit : le CDN Netlify ignorerait le paramètre « q » et servirait la même ville à tous.
  return Response.json(cities, { headers: { "Cache-Control": "private, max-age=86400", "Netlify-CDN-Cache-Control": "no-store" } });
}
