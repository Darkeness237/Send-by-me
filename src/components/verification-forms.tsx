"use client";

import { Camera, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useActionState, useState, useSyncExternalStore } from "react";
import { submitAddressVerification, submitIdentityVerification, submitTripProof } from "@/app/actions/verification";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
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

type Contact = { phone: string | null; address_line: string | null; postal_code: string | null; address_city: string | null; country: string | null };

export function AddressVerificationForm({ userId, contact }: { userId: string; contact: Contact | null }) {
  const [state, action, pending] = useActionState(submitAddressVerification, null);
  if (state?.ok) {
    clearUploads(userId);
    return <FormMessage state={state} />;
  }
  return (
    <form action={action} className="space-y-4">
      <Field label="Téléphone" htmlFor="addr_phone" hint="Jamais affiché aux autres membres.">
        <Input id="addr_phone" name="phone" type="tel" required autoComplete="tel" defaultValue={contact?.phone ?? ""} placeholder="+33 6 12 34 56 78" />
      </Field>
      <Field label="Adresse" htmlFor="address_line">
        <Input id="address_line" name="address_line" required maxLength={200} autoComplete="street-address" defaultValue={contact?.address_line ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Code postal" htmlFor="postal_code">
          <Input id="postal_code" name="postal_code" maxLength={20} autoComplete="postal-code" defaultValue={contact?.postal_code ?? ""} />
        </Field>
        <Field label="Ville" htmlFor="address_city">
          <Input id="address_city" name="address_city" required maxLength={80} autoComplete="address-level2" defaultValue={contact?.address_city ?? ""} />
        </Field>
        <Field label="Pays" htmlFor="country_addr">
          <Input id="country_addr" name="country" required maxLength={60} autoComplete="country-name" defaultValue={contact?.country ?? ""} />
        </Field>
      </div>
      <FilePicker
        name="proof_path"
        userId={userId}
        label="Justificatif de domicile"
        hint="Facture d'électricité, d'eau, d'internet ou avis d'imposition de moins de 3 mois"
      />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer mon justificatif"}
      </Button>
    </form>
  );
}
