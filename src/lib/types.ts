export type TransportCheck = "unchecked" | "consistent" | "confirmed" | "mismatch";
export type TransportCheckNote = { ok: boolean; label: string };

export type TripMode = "plane" | "car" | "bus" | "train";
export type TripStatus = "published" | "full" | "departed" | "completed" | "cancelled";

export type BookingStatus =
  | "pending" // demande envoyée au voyageur
  | "accepted" // acceptée, en attente de paiement
  | "paid" // payée, argent bloqué
  | "picked_up" // colis remis au voyageur
  | "delivered" // livré, code confirmé
  | "declined"
  | "cancelled"
  | "refunded";

// Types de colis, rangés par famille. Les identifiants sont enregistrés en base : ne jamais en renommer un.
export const CATEGORY_GROUPS = ["Mode et beauté", "Enfants et maison", "High-tech", "Alimentation et santé", "Papiers et loisirs", "Divers"] as const;

export const CATEGORIES = [
  { id: "clothing", label: "Vêtements et chaussures", group: "Mode et beauté" },
  { id: "accessories", label: "Sacs, montres et accessoires", group: "Mode et beauté" },
  { id: "jewelry", label: "Bijoux fantaisie", group: "Mode et beauté" },
  { id: "cosmetics", label: "Cosmétiques (sans liquides > 100 ml)", group: "Mode et beauté" },
  { id: "hair", label: "Mèches, perruques et soins capillaires", group: "Mode et beauté" },
  { id: "baby", label: "Articles pour bébé", group: "Enfants et maison" },
  { id: "toys", label: "Jouets", group: "Enfants et maison" },
  { id: "school", label: "Fournitures scolaires", group: "Enfants et maison" },
  { id: "textiles", label: "Linge de maison, pagnes et tissus", group: "Enfants et maison" },
  { id: "kitchen", label: "Ustensiles de cuisine", group: "Enfants et maison" },
  { id: "decor", label: "Décoration et artisanat", group: "Enfants et maison" },
  { id: "phones", label: "Téléphones et tablettes", group: "High-tech" },
  { id: "electronics", label: "Ordinateurs, consoles et autre électronique", group: "High-tech" },
  { id: "tech_accessories", label: "Câbles, chargeurs et accessoires", group: "High-tech" },
  { id: "food", label: "Alimentaire sec et emballé", group: "Alimentation et santé" },
  { id: "spices", label: "Épices, farines et condiments secs", group: "Alimentation et santé" },
  { id: "medication", label: "Médicaments avec ordonnance", group: "Alimentation et santé" },
  { id: "documents", label: "Documents", group: "Papiers et loisirs" },
  { id: "books", label: "Livres", group: "Papiers et loisirs" },
  { id: "sports", label: "Articles de sport", group: "Papiers et loisirs" },
  { id: "music", label: "Instruments et accessoires de musique", group: "Papiers et loisirs" },
  { id: "spare_parts", label: "Pièces auto et petites pièces détachées", group: "Divers" },
  { id: "tools", label: "Outils à main", group: "Divers" },
  { id: "gifts", label: "Cadeaux et objets personnels", group: "Divers" },
  { id: "other", label: "Autre (à préciser dans la description)", group: "Divers" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

/** Catégories regroupées par famille, dans l'ordre d'affichage (familles vides omises). */
export function groupedCategories<T extends { group: string }>(list: readonly T[]) {
  return CATEGORY_GROUPS.map((group) => ({ group, items: list.filter((c) => c.group === group) })).filter((g) => g.items.length);
}

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  id_verified: boolean;
  address_verified?: boolean;
  certified?: boolean;
  intent?: "send" | "travel" | "both";
  created_at: string;
  rating_avg?: number | null;
  rating_count?: number | null;
};

export type Trip = {
  id: string;
  traveler_id: string;
  from_city: string;
  from_country: string;
  to_city: string;
  to_country: string;
  departure_at: string;
  arrival_at: string | null;
  mode: TripMode;
  capacity_kg: number;
  reserved_kg: number;
  price_per_kg_cents: number;
  accepted_categories: CategoryId[];
  pickup_note: string | null;
  dropoff_note: string | null;
  notes: string | null;
  status: TripStatus;
  ticket_verified?: boolean;
  from_tz?: string | null;
  to_tz?: string | null;
  carrier?: string | null;
  transport_ref?: string | null;
  from_airport?: string | null;
  to_airport?: string | null;
  has_stopover?: boolean;
  baggage_allowance_kg?: number | null;
  transport_check?: TransportCheck;
  transport_check_notes?: TransportCheckNote[];
  created_at: string;
  traveler?: Profile | null;
};

export type Booking = {
  id: string;
  trip_id: string;
  sender_id: string;
  weight_kg: number;
  category: CategoryId;
  description: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_email?: string | null;
  recipient_notified_at?: string | null;
  price_per_kg_cents?: number | null;
  base_cents: number;
  delivery_cents?: number;
  delivery_status?: "requested" | "scheduled" | "out_for_delivery" | "delivered" | "failed" | null;
  tracking_code?: string;
  fee_cents: number;
  discount_cents?: number;
  total_cents: number;
  status: BookingStatus;
  payout_status?: PayoutStatus;
  created_at: string;
  trip?: Trip | null;
  sender?: Profile | null;
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "En attente du voyageur",
  accepted: "Acceptée, à payer",
  paid: "En attente du colis",
  picked_up: "Colis reçu par le voyageur",
  delivered: "Colis réceptionné",
  declined: "Refusée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

export type PayoutStatus = "not_due" | "due" | "paid";

export type PriceOffer = {
  id: string;
  booking_id: string;
  author_id: string;
  price_per_kg_cents: number;
  status: "pending" | "accepted" | "declined" | "superseded";
  created_at: string;
};

/** Statut affiché : le transit et l'arrivée se lisent dans les étapes de suivi. */
export function bookingStatusLabel(status: BookingStatus, events: { kind: string }[] = []) {
  if (status === "picked_up") {
    if (events.some((e) => e.kind === "arrived")) return "Arrivé à destination";
    if (events.some((e) => e.kind === "departed")) return "En transit";
  }
  return STATUS_LABEL[status];
}

export const REPORT_REASONS = [
  { id: "not_delivered", label: "Le colis n'a pas été livré" },
  { id: "damaged", label: "Le colis est abîmé ou incomplet" },
  { id: "forbidden_item", label: "Le colis contenait un objet interdit" },
  { id: "behaviour", label: "Comportement inapproprié" },
  { id: "payment", label: "Problème de paiement" },
  { id: "other", label: "Autre" },
] as const;
