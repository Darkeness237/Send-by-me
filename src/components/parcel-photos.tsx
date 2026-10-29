"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Camera, CheckCircle2, Loader2, X } from "lucide-react";
import { addBookingPhoto, removeBookingPhoto } from "@/app/actions/photos";
import { MAX_PHOTOS_PER_STEP, PHOTO_STEPS, type PhotoKind } from "@/lib/parcel-photos";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus } from "@/lib/types";
import { useLocale, useT } from "@/i18n/client";
import { intlLocale } from "@/i18n/config";

export type BookingPhoto = { id: string; kind: string; url: string | null; at: string; mine?: boolean };

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

/** Retirer sa propre photo (prise par erreur) tant que l'étape est ouverte, pour en reprendre une. */
function RemovePhoto({ photoId, label }: { photoId: string; label: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    if (!confirm(t("Retirer cette photo pour en prendre une autre ?"))) return;
    setBusy(true);
    setError(null);
    const res = await removeBookingPhoto(photoId);
    if (res.error) setError(t(res.error));
    setBusy(false);
  }
  return (
    <>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        aria-label={t("Retirer la photo « {label} »", { label })}
        className="absolute -top-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-danger-fill text-white shadow ring-2 ring-card hover:brightness-110 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" strokeWidth={2.5} />}
      </button>
      {error && (
        <p role="alert" className="absolute top-full left-0 mt-1 w-48 text-xs text-danger">
          {error}
        </p>
      )}
    </>
  );
}

function StepUpload({ bookingId, kind }: { bookingId: string; kind: PhotoKind }) {
  const t = useT();
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
        setError(t("Format accepté : photo JPEG, PNG, WebP ou HEIC."));
        continue;
      }
      const blob = await shrink(file);
      const type = blob.type || file.type;
      if (blob.size > 8 * 1024 * 1024) {
        setError(t("Photo trop lourde (8 Mo maximum)."));
        continue;
      }
      const path = `${bookingId}/${kind}-${crypto.randomUUID()}.${EXT[type] ?? "jpg"}`;
      const { error: upErr } = await createClient().storage.from("parcel-photos").upload(path, blob, { contentType: type });
      if (upErr) {
        setError(t("Envoi impossible. Vérifiez votre connexion et réessayez."));
        continue;
      }
      const res = await addBookingPhoto(bookingId, kind, path);
      if (res.error) setError(t(res.error));
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-fill px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong has-[:disabled]:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
        {busy ? t("Envoi…") : t("Ajouter une photo")}
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
  const t = useT();
  const lang = useLocale();
  const open = ["accepted", "paid", "picked_up", "delivered"].includes(status);
  if (!open && !photos.length) return null;
  return (
    <section id="photos" className="scroll-mt-20 rounded-3xl bg-card p-6 ring-1 ring-line sm:p-8" aria-labelledby="photos-title">
      <h2 id="photos-title" className="text-lg font-bold">
        {t("Photos du colis")}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {t("Le même colis, photographié au départ, à la prise en charge et à l'arrivée. Les photos restent privées entre vous deux et l'équipe Send By Me.")}
      </p>
      <ol className="mt-5 space-y-5">
        {PHOTO_STEPS.map((step, i) => {
          const mine = step.by === role;
          const list = photos.filter((p) => p.kind === step.kind);
          const stepOpen = mine && step.when.includes(status);
          const canAdd = stepOpen && list.length < MAX_PHOTOS_PER_STEP;
          const who = step.by === "sender" ? senderName : travelerName;
          return (
            <li key={step.kind} className="rounded-2xl bg-paper p-4" data-photo-step={step.kind}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    {list.length ? (
                      <CheckCircle2 className="h-4 w-4 text-ok" aria-label={t("Fait")} />
                    ) : (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-card text-xs ring-1 ring-line">{i + 1}</span>
                    )}
                    {t(step.label)}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{mine ? t(step.hint) : t("Par {who}", { who })}</p>
                </div>
                {canAdd && <StepUpload bookingId={bookingId} kind={step.kind} />}
              </div>
              {list.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-3">
                  {list.map((p) =>
                    p.url ? (
                      <li key={p.id} className="relative">
                        <a href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl ring-1 ring-line hover:ring-brand">
                          {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire du stockage privé */}
                          <img src={p.url} alt={t("{label}, photo du {date}", { label: t(step.label), date: new Date(p.at).toLocaleString(intlLocale(lang)) })} className="h-24 w-24 object-cover" />
                        </a>
                        {stepOpen && p.mine && <RemovePhoto photoId={p.id} label={t(step.label)} />}
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
