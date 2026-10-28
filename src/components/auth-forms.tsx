"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { submitKeepingValues } from "@/components/ui/keep-form";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="suite" value={next ?? ""} />
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field
        label="Mot de passe"
        htmlFor="password"
        hint={
          <Link href="/mot-de-passe-oublie" className="font-semibold text-brand">
            Mot de passe oublié ?
          </Link>
        }
      >
        <PasswordInput id="password" name="password" autoComplete="current-password" required minLength={8} />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href={`/inscription${next ? `?suite=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

const COUNTRIES = ["France", "Belgique", "Cameroun", "Sénégal", "Côte d'Ivoire", "Gabon", "RD Congo", "Congo", "Togo", "Bénin", "Mali", "Maroc", "Autre"];

/** Indication simple de robustesse : longueur et variété des caractères. */
function passwordStrength(pw: string) {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 8) return { level: 0, label: "Trop court (8 caractères minimum)" };
  if (score <= 2) return { level: 1, label: "Faible : ajoutez des chiffres ou des symboles" };
  if (score <= 3) return { level: 2, label: "Correct" };
  return { level: 3, label: "Solide" };
}

export function SignUpForm({ next, referral }: { next?: string; referral?: string }) {
  const [state, action, pending] = useActionState(signUp, null);
  const [password, setPassword] = useState("");
  const strength = passwordStrength(password);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} onSubmit={submitKeepingValues(action)} className="space-y-5">
      <input type="hidden" name="suite" value={next ?? ""} />
      {referral && <input type="hidden" name="parrain" value={referral} />}

      <fieldset>
        <legend className="text-sm font-semibold">Vous souhaitez</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { v: "send", label: "Envoyer des colis" },
            { v: "travel", label: "Proposer mes kilos" },
            { v: "both", label: "Les deux" },
          ].map((o) => (
            <label
              key={o.v}
              className="flex cursor-pointer items-center justify-center rounded-xl border border-line px-2 py-3 text-center text-sm font-semibold has-checked:border-brand has-checked:bg-brand-pale has-checked:text-brand-deep"
            >
              <input type="radio" name="intent" value={o.v} defaultChecked={o.v === "both"} className="sr-only" />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="first_name">
          <Input id="first_name" name="first_name" required maxLength={40} autoComplete="given-name" />
        </Field>
        <Field label="Nom" htmlFor="last_name" hint="Seule l'initiale est visible : « Aïcha N. »">
          <Input id="last_name" name="last_name" required maxLength={60} autoComplete="family-name" />
        </Field>
      </div>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Téléphone" htmlFor="phone" hint="Facultatif. Jamais affiché ; utile pour la certification du compte.">
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+33 6 12 34 56 78" />
        </Field>
        <Field label="Pays de résidence" htmlFor="country">
          <Select id="country" name="country" defaultValue="France" autoComplete="country-name">
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Mot de passe" htmlFor="password" hint={strength?.label ?? "8 caractères minimum"}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {strength && (
          <div className="mt-2 grid grid-cols-3 gap-1" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full ${
                  strength.level >= i ? (strength.level === 1 ? "bg-danger" : strength.level === 2 ? "bg-signal" : "bg-ok") : "bg-line"
                }`}
              />
            ))}
          </div>
        )}
      </Field>
      <label className="flex items-start gap-3 text-sm text-ink-soft">
        <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 accent-brand" />
        <span>
          J&apos;accepte les{" "}
          <Link href="/cgu" target="_blank" className="font-semibold text-brand">
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link href="/confidentialite" target="_blank" className="font-semibold text-brand">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </Button>
      <p className="text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href={`/connexion${next ? `?suite=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
