// Photos du colis à chaque étape : la même boîte doit être reconnaissable du départ à l'arrivée.
import type { BookingStatus } from "@/lib/types";

export type PhotoKind = "contents" | "packed" | "pickup" | "arrival_packed";

export const PHOTO_STEPS: { kind: PhotoKind; by: "sender" | "traveler"; when: BookingStatus[]; label: string; hint: string }[] = [
  { kind: "contents", by: "sender", when: ["accepted", "paid"], label: "Contenu avant emballage", hint: "Tout le contenu, bien visible, avant de fermer le colis." },
  { kind: "packed", by: "sender", when: ["accepted", "paid"], label: "Colis emballé", hint: "Le colis fermé, avec l'étiquette du destinataire si possible." },
  { kind: "pickup", by: "traveler", when: ["paid"], label: "Prise en charge par le voyageur", hint: "Vérifiez le contenu avant qu'il soit fermé, puis photographiez le colis emballé au moment où vous le recevez." },
  { kind: "arrival_packed", by: "traveler", when: ["picked_up"], label: "À l'arrivée, toujours fermé", hint: "Le colis tel qu'il arrive : on doit voir qu'il n'a pas été ouvert en route." },
];

export const MAX_PHOTOS_PER_STEP = 4;

/** Étapes photo à compléter avant la prise en charge, puis avant la validation de la réception. */
export const REQUIRED_BEFORE_PICKUP: PhotoKind[] = ["contents", "packed", "pickup"];
export const REQUIRED_BEFORE_DELIVERY: PhotoKind[] = ["arrival_packed"];

export const missingPhotos = (have: { kind: string }[], required: PhotoKind[]) => required.filter((k) => !have.some((p) => p.kind === k));
