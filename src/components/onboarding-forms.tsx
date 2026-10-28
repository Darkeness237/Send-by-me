"use client";

import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { saveAvatar, sendPhoneCode, verifyPhoneCode } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/i18n/client";

const AVATAR_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Photo de profil : dépôt direct dans le dossier du membre, puis enregistrement sur le profil. */
export function AvatarUploader({ userId, current, name }: { userId: string; current: string | null; name: string }) {
  const t = useT();
  const [preview, setPreview] = useState<string | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-4">
      <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-paper ring-1 ring-line">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={t("Photo de {name}", { name })} className="h-full w-full object-cover" />
        ) : (
          <Camera className="absolute inset-0 m-auto h-7 w-7 text-muted" aria-hidden="true" />
        )}
        {pending && <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-brand" aria-hidden="true" />}
      </span>
      <div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-ink/30">
          <Camera className="h-4 w-4" aria-hidden="true" /> {preview ? t("Changer de photo") : t("Ajouter une photo")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const ext = AVATAR_TYPES[file.type];
              if (!ext) return setError(t("Format accepté : JPG, PNG ou WEBP."));
              if (file.size > 5 * 1024 * 1024) return setError(t("Photo trop lourde (5 Mo maximum)."));
              setError(null);
              start(async () => {
                const path = `${userId}/${crypto.randomUUID()}.${ext}`;
                const { error: upErr } = await createClient().storage.from("avatars").upload(path, file, { contentType: file.type });
                if (upErr) return setError(t("Envoi impossible. Réessayez."));
                const r = await saveAvatar(path);
                if ("error" in r && r.error) return setError(t(r.error));
                setPreview(URL.createObjectURL(file));
              });
            }}
          />
        </label>
        <p className="mt-1.5 text-sm text-muted">{t("Une photo nette de votre visage inspire confiance.")}</p>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}

const DIALS = [
  ["+33", "France"],
  ["+32", "Belgique"],
  ["+237", "Cameroun"],
  ["+221", "Sénégal"],
  ["+225", "Côte d'Ivoire"],
  ["+241", "Gabon"],
  ["+243", "RD Congo"],
  ["+242", "Congo"],
  ["+228", "Togo"],
  ["+229", "Bénin"],
  ["+223", "Mali"],
  ["+212", "Maroc"],
  ["+41", "Suisse"],
  ["+44", "Royaume-Uni"],
  ["+1", "Canada / États-Unis"],
];

/** Vérification du numéro : envoi d'un code par SMS, puis saisie du code. */
export function PhoneVerifier({ verifiedPhone }: { verifiedPhone: string | null }) {
  const t = useT();
  const [sent, sendAction, sending] = useActionState(sendPhoneCode, null);
  const [checked, verifyAction, verifying] = useActionState(verifyPhoneCode, null);
  if (verifiedPhone || checked?.ok) {
    return (
      <p className="flex items-center gap-2 font-semibold text-ok">
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />{" "}{t("Numéro vérifié")}{verifiedPhone ? ` : ${verifiedPhone}` : ""}
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <form action={sendAction} className="flex flex-wrap items-end gap-2">
        <Field label={t("Indicatif")} htmlFor="dial">
          <Select id="dial" name="dial" defaultValue="+33" className="w-36">
            {DIALS.map(([d, c]) => (
              <option key={d} value={d}>
                {d} {t(c)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="min-w-48 flex-1">
          <Field label={t("Numéro de mobile")} htmlFor="phone">
            <Input id="phone" name="phone" type="tel" required autoComplete="tel-national" placeholder="6 12 34 56 78" />
          </Field>
        </div>
        <Button type="submit" variant="outline" disabled={sending}>
          {sending ? t("Envoi…") : sent?.ok ? t("Renvoyer") : t("Recevoir le code")}
        </Button>
      </form>
      <FormMessage state={sent} />
      {sent?.ok && (
        <form action={verifyAction} className="flex items-end gap-2">
          <Field label={t("Code reçu par SMS")} htmlFor="sms-code">
            <Input id="sms-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className="wide tabular w-40 tracking-[0.3em]" />
          </Field>
          <Button type="submit" disabled={verifying}>
            {verifying ? t("Vérification…") : t("Valider")}
          </Button>
        </form>
      )}
      <FormMessage state={checked} />
    </div>
  );
}
