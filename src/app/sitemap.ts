import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { CORRIDORS, corridorSlug } from "@/lib/places";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/recherche", "/comment-ca-marche", "/securite", "/objets-interdits", "/publier", "/inscription", "/cgu", "/confidentialite"];
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...CORRIDORS.map(([a, b]) => ({
      url: `${SITE_URL}/envoyer-un-colis/${corridorSlug(a, b)}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
