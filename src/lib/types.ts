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

export const CATEGORIES = [
  { id: "documents", label: "Documents" },
  { id: "clothing", label: "Vêtements et chaussures" },
  { id: "electronics", label: "Électronique" },
  { id: "cosmetics", label: "Cosmétiques (sans liquides > 100 ml)" },
  { id: "books", label: "Livres" },
  { id: "food", label: "Alimentaire sec et emballé" },
  { id: "gifts", label: "Cadeaux et objets personnels" },
  { id: "medication", label: "Médicaments avec ordonnance" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

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
  home_delivery_cents?: number | null;
  home_delivery_area?: string | null;
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
  base_cents: number;
  delivery_cents?: number;
  delivery_address?: string | null;
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
  paid: "Payée",
  picked_up: "En route",
  delivered: "Livrée",
  declined: "Refusée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

export type PayoutStatus = "not_due" | "due" | "paid";

export const REPORT_REASONS = [
  { id: "not_delivered", label: "Le colis n'a pas été livré" },
  { id: "damaged", label: "Le colis est abîmé ou incomplet" },
  { id: "forbidden_item", label: "Le colis contenait un objet interdit" },
  { id: "behaviour", label: "Comportement inapproprié" },
  { id: "payment", label: "Problème de paiement" },
  { id: "other", label: "Autre" },
] as const;
