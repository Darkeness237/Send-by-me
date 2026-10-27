import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/espace", "/reservations", "/messages", "/admin", "/bienvenue", "/notifications", "/suivi/", "/api", "/auth"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
