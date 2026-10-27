import type { Profile, Trip } from "./types";

// Données d'exemple affichées uniquement quand Supabase n'est pas configuré (mode démo).

const day = 24 * 3600 * 1000;
const at = (days: number, hour: number) => {
  const d = new Date(Date.now() + days * day);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

const people: Profile[] = [
  { id: "p1", full_name: "Aïcha N.", avatar_url: null, bio: "Je rentre à Douala tous les deux mois pour la famille.", city: "Paris", id_verified: true, created_at: "2025-03-01", rating_avg: 4.9, rating_count: 37 },
  { id: "p2", full_name: "Moussa D.", avatar_url: null, bio: "Commerçant, aller-retour Dakar régulier.", city: "Marseille", id_verified: true, created_at: "2024-11-12", rating_avg: 4.8, rating_count: 52 },
  { id: "p3", full_name: "Grâce K.", avatar_url: null, bio: "Étudiante à Lyon, je voyage léger.", city: "Lyon", id_verified: true, created_at: "2025-06-20", rating_avg: 5, rating_count: 9 },
  { id: "p4", full_name: "Jean-Paul M.", avatar_url: null, bio: null, city: "Bruxelles", id_verified: false, created_at: "2025-09-02", rating_avg: 4.6, rating_count: 14 },
  { id: "p5", full_name: "Fatou S.", avatar_url: null, bio: "Hôtesse de l'air, je propose mes kilos libres.", city: "Paris", id_verified: true, created_at: "2024-07-15", rating_avg: 4.9, rating_count: 88 },
];

const t = (
  id: string,
  p: number,
  from: [string, string],
  to: [string, string],
  days: number,
  hour: number,
  cap: number,
  reserved: number,
  price: number,
): Trip => ({
  id,
  traveler_id: people[p].id,
  traveler: people[p],
  from_city: from[0],
  from_country: from[1],
  to_city: to[0],
  to_country: to[1],
  departure_at: at(days, hour),
  arrival_at: at(days, hour + 7),
  mode: "plane",
  capacity_kg: cap,
  reserved_kg: reserved,
  price_per_kg_cents: price,
  accepted_categories: ["documents", "clothing", "cosmetics", "gifts", "books", "electronics"],
  pickup_note: "Remise en main propre près de la gare la veille du départ.",
  dropoff_note: "Le destinataire récupère le colis à mon arrivée, ou je le dépose en ville.",
  notes: "Colis ouverts devant moi avant fermeture. Pas de liquides.",
  status: "published",
  created_at: at(-3, 10),
});

export function demoTrips(): Trip[] {
  return [
  t("demo-1", 0, ["Paris", "France"], ["Douala", "Cameroun"], 3, 9, 23, 8, 900),
  t("demo-2", 1, ["Marseille", "France"], ["Dakar", "Sénégal"], 5, 13, 15, 3, 800),
  t("demo-3", 2, ["Lyon", "France"], ["Yaoundé", "Cameroun"], 6, 7, 10, 0, 1000),
  t("demo-4", 3, ["Bruxelles", "Belgique"], ["Kinshasa", "RD Congo"], 8, 11, 20, 12, 1100),
  t("demo-5", 4, ["Paris", "France"], ["Abidjan", "Côte d'Ivoire"], 9, 15, 12, 2, 850),
  t("demo-6", 0, ["Douala", "Cameroun"], ["Paris", "France"], 12, 22, 23, 0, 1000),
  t("demo-7", 4, ["Paris", "France"], ["Libreville", "Gabon"], 14, 10, 18, 6, 950),
  t("demo-8", 1, ["Dakar", "Sénégal"], ["Paris", "France"], 16, 1, 15, 0, 900),
  ];
}
