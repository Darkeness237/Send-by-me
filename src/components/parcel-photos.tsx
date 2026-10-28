"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { addBookingPhoto } from "@/app/actions/photos";
import { MAX_PHOTOS_PER_STEP, PHOTO_STEPS, type PhotoKind } from "@/lib/parcel-photos";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus } from "@/lib/types";

export type BookingPhoto = { id: string; kind: string; url: string | null; at: string };

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

/** Réduit les photos de téléphone (souvent 5 à 12 Mo) avant l'envoi ; garde l'original si le navigateur ne sait pas la lire. */
async function shrink(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

const noop = () => () => {};

function StepUpload({ bookingId, kind }: { bookingId: string; kind: PhotoKind }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Le sélecteur reste inactif tant que la page n'est pas prête, sinon le fichier choisi serait ignoré.
  const ready = useSyncExternalStore(noop, () => true, () => false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      if (!EXT[file.type]) {
        setError("Format accepté : photo JPEG, PNG, WebP ou HEIC.");
        continue;
      }
      const blob = await shrink(file);
      const type = blob.type || file.type;
      if (blob.size > 8 * 1024 * 1024) {
        setError("Photo trop lourde (8 Mo maximum).");
        continue;
      }
      const path = `${bookingId}/${kind}-${crypto.randomUUID()}.${EXT[type] ?? "jpg"}`;
      const { error: upErr } = await createClient().storage.from("parcel-photos").upload(path, blob, { contentType: type });
      if (upErr) {
        setError("Envoi impossible. Vérifiez votre connexion et réessayez.");
        continue;
      }
      const res = await addBookingPhoto(bookingId, kind, path);
      if (res.error) setError(res.error);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep has-[:disabled]:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
        {busy ? "Envoi…" : "Ajouter une photo"}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          disabled={busy || !ready}
          className="sr-only"
          data-photo-kind={kind}
          onChange={(e) => upload(e.target.files)}
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Traçabilité du colis : photos du contenu, du colis emballé, de la prise en charge et de l'arrivée.
 * Chaque participant ajoute les photos de son étape ; tous deux voient l'ensemble.
 */
export function ParcelPhotos({
  bookingId,
  photos,
  role,
  status,
  senderName,
  travelerName,
}: {
  bookingId: string;
  photos: BookingPhoto[];
  role: "sender" | "traveler";
  status: BookingStatus;
  senderName: string;
  travelerName: string;
}) {
  const open = ["accepted", "paid", "picked_up", "delivered"].includes(status);
  if (!open && !photos.length) return null;
  return (
    <section id="photos" className="scroll-mt-20 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8" aria-labelledby="photos-title">
      <h2 id="photos-title" className="text-lg font-bold">
        Photos du colis
      </h2>
      <p className="mt-1 text-sm text-muted">
        Le même colis, photographié au départ, à la prise en charge et à l&apos;arrivée. Les photos restent privées entre vous deux et l&apos;équipe Send By Me.
      </p>
      <ol className="mt-5 space-y-5">
        {PHOTO_STEPS.map((step, i) => {
          const mine = step.by === role;
          const list = photos.filter((p) => p.kind === step.kind);
          const canAdd = mine && step.when.includes(status) && list.length < MAX_PHOTOS_PER_STEP;
          const who = step.by === "sender" ? senderName : travelerName;
          return (
            <li key={step.kind} className="rounded-2xl bg-paper p-4" data-photo-step={step.kind}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    {list.length ? (
                      <CheckCircle2 className="h-4 w-4 text-ok" aria-label="Fait" />
                    ) : (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs ring-1 ring-line">{i + 1}</span>
                    )}
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{mine ? step.hint : `Par ${who}`}</p>
                </div>
                {canAdd && <StepUpload bookingId={bookingId} kind={step.kind} />}
              </div>
              {list.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {list.map((p) =>
                    p.url ? (
                      <li key={p.id}>
                        <a href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl ring-1 ring-line hover:ring-brand">
                          {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire du stockage privé */}
                          <img src={p.url} alt={`${step.label}, photo du ${new Date(p.at).toLocaleString("fr-FR")}`} className="h-24 w-24 object-cover" />
                        </a>
                      </li>
                    ) : null,
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
