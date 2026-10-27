"use client";

import { Camera, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useActionState, useState, useSyncExternalStore } from "react";
import { submitIdentityVerification, submitTripProof } from "@/app/actions/verification";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Select } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "verification-documents";
const MAX = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

const noopSubscribe = () => () => {};

type Upload = { busy?: boolean; path?: string; file?: string; error?: string };

function parseSaved(raw: string | null, userId: string): Upload | null {
  try {
    const v = JSON.parse(raw ?? "null");
    return v?.path?.startsWith(`${userId}/`) ? v : null;
  } catch {
    return null;
  }
}

function clearUploads(userId: string) {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(`sbm-upload-${userId}-`))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

/** Dépose un fichier dans le dossier privé du membre ; renvoie son chemin. */
function useUpload(userId: string) {
  return async (file: File): Promise<{ path?: string; error?: string }> => {
    if (!TYPES.includes(file.type)) return { error: "Format accepté : photo (JPG, PNG, WEBP, HEIC) ou PDF." };
    if (file.size > MAX) return { error: "Fichier trop lourd (10 Mo maximum)." };
    const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    return error ? { error: "Envoi impossible. Vérifiez votre connexion et réessayez." } : { path };
  };
}

function FilePicker({
  label,
  hint,
  name,
  userId,
  capture,
  accept = "image/*,application/pdf",
}: {
  label: string;
  hint?: string;
  name: string;
  userId: string;
  capture?: "user" | "environment";
  accept?: string;
}) {
  const upload = useUpload(userId);
  // Mémorisé pour la session : un fichier déjà déposé n'est pas perdu si la page se rafraîchit après une erreur.
  const key = `sbm-upload-${userId}-${name}`;
  const [local, setStateRaw] = useState<{ busy?: boolean; path?: string; file?: string; error?: string } | null>(null);
  const savedRaw = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const saved = parseSaved(savedRaw, userId);
  const state: Upload = local ?? saved ?? {};
  const setState = (v: { busy?: boolean; path?: string; file?: string; error?: string }) => {
    setStateRaw(v);
    try {
      if (v.path) sessionStorage.setItem(key, JSON.stringify({ path: v.path, file: v.file }));
      else sessionStorage.removeItem(key);
    } catch {}
  };
  return (
    <div>
      <input type="hidden" name={name} value={state.path ?? ""} />
      <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-line bg-paper px-4 py-4 hover:border-brand">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-line">
          {state.busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden="true" />
          ) : state.path ? (
            <CheckCircle2 className="h-5 w-5 text-ok" aria-hidden="true" />
          ) : capture ? (
            <Camera className="h-5 w-5 text-brand" aria-hidden="true" />
          ) : (
            <FileUp className="h-5 w-5 text-brand" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{label}</span>
          <span className="block truncate text-sm text-muted">{state.path ? state.file : hint ?? "Photo nette ou PDF, 10 Mo maximum"}</span>
        </span>
        <input
          type="file"
          accept={accept}
          capture={capture}
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setState({ busy: true, file: file.name });
            const r = await upload(file);
            setState(r.path ? { path: r.path, file: file.name } : { error: r.error });
          }}
        />
      </label>
      {state.error && <p className="mt-1.5 text-sm text-danger">{state.error}</p>}
    </div>
  );
}

export function IdentityVerificationForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(submitIdentityVerification, null);
  const [docType, setDocType] = useState("cni");
  if (state?.ok) {
    clearUploads(userId);
    return <FormMessage state={state} />;
  }
  return (
    <form action={action} className="space-y-4">
      <Field label="Pièce d'identité" htmlFor="document_type">
        <Select id="document_type" name="document_type" value={docType} onChange={(e) => setDocType(e.target.value)}>
          <option value="cni">Carte nationale d&apos;identité</option>
          <option value="passport">Passeport</option>
          <option value="residence_permit">Titre de séjour</option>
          <option value="driving_license">Permis de conduire</option>
        </Select>
      </Field>
      <FilePicker name="front_path" userId={userId} label={docType === "passport" ? "Page photo du passeport" : "Recto de la pièce"} capture="environment" />
      {docType !== "passport" && <FilePicker name="back_path" userId={userId} label="Verso de la pièce" capture="environment" />}
      <FilePicker name="selfie_path" userId={userId} label="Selfie en tenant votre pièce" hint="Visage et pièce bien visibles" capture="user" accept="image/*" />
      <p className="text-sm text-muted">
        Vos documents sont stockés dans un espace privé, consultés uniquement par l&apos;équipe Send By Me, puis supprimés dès la fin du contrôle.
      </p>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer pour vérification"}
      </Button>
    </form>
  );
}

export function TripProofForm({ userId, tripId }: { userId: string; tripId: string }) {
  const [state, action, pending] = useActionState(submitTripProof, null);
  if (state?.ok) {
    clearUploads(userId);
    return <FormMessage state={state} />;
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="trip_id" value={tripId} />
      <FilePicker name="file_path" userId={userId} label="Billet ou carte d'embarquement" hint="Votre nom et la date doivent être lisibles" />
      <FormMessage state={state} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer le justificatif"}
      </Button>
    </form>
  );
}
