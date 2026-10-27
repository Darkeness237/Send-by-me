"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="suite" value={next ?? ""} />
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Mot de passe" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
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

export function SignUpForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signUp, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="suite" value={next ?? ""} />
      <Field label="Prénom et initiale du nom" htmlFor="full_name" hint="C'est ce que verront les autres membres, par exemple « Aïcha N. »">
        <Input id="full_name" name="full_name" required maxLength={80} autoComplete="name" />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Mot de passe" htmlFor="password" hint="8 caractères minimum">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
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
