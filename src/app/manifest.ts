import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Send By Me · colis entre voyageurs",
    short_name: "Send By Me",
    description: "Envoyez un colis avec un voyageur vérifié entre l'Europe et l'Afrique. Paiement bloqué jusqu'à la livraison.",
    lang: "fr",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0E304C",
    theme_color: "#0E304C",
    categories: ["travel", "shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Trouver un voyageur", url: "/recherche", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Proposer mes kilos", url: "/publier", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mon espace", url: "/espace", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
