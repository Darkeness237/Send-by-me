"use client";

import { useActionState, useState } from "react";
import { createReport, requestPasswordReset, updatePassword, updateProfile } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { REPORT_REASONS } from "@/lib/types";

export function ProfileForm({ profile }: { profile: { full_name: string; city: string | null; bio: string | null } }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="space-y-5">
      <Field label="Nom affiché" htmlFor="full_name" hint="Prénom et initiale du nom, par exemple « Aïcha N. »">
        <Input id="full_name" name="full_name" required maxLength={80} defaultValue={profile.full_name} />
      </Field>
      <Field label="Ville" htmlFor="city">
        <Input id="city" name="city" maxLength={80} defaultValue={profile.city ?? ""} placeholder="Paris" />
      </Field>
      <Field label="Présentation" htmlFor="bio" hint="Quelques mots pour rassurer les autres membres : vos trajets habituels, vos règles.">
        <Textarea id="bio" name="bio" maxLength={600} defaultValue={profile.bio ?? ""} />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-5">
      <Field label="E-mail du compte" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir le lien"}
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form action={action} className="space-y-5">
      <Field label="Nouveau mot de passe" htmlFor="password" hint="8 caractères minimum">
        <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Field label="Confirmer" htmlFor="confirm">
        <PasswordInput id="confirm" name="confirm" required minLength={8} autoComplete="new-password" />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Enregistrement…" : "Changer mon mot de passe"}
      </Button>
    </form>
  );
}

export function ReportForm({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createReport, null);
  if (state?.ok) return <FormMessage state={state} />;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-danger underline-offset-4 hover:underline">
        Signaler un problème
      </button>
    );
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-danger/20 bg-danger-pale/40 p-5">
      <input type="hidden" name="booking_id" value={bookingId} />
      <h3 className="font-bold">Signaler un problème</h3>
      <Field label="Motif" htmlFor="reason">
        <Select id="reason" name="reason" required defaultValue="">
          <option value="" disabled>
            Choisir
          </option>
          {REPORT_REASONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ce qui s'est passé" htmlFor="details">
        <Textarea id="details" name="details" required minLength={10} maxLength={2000} />
      </Field>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer le signalement"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
