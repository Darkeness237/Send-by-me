"use client";

import { useState } from "react";
import { BadgeCheck, KeyRound, Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { euros, quote } from "@/lib/pricing";
import { useT } from "@/i18n/client";

/** Visiteur sans compte : il simule le prix exact sur ce trajet avant qu'on lui demande de s'inscrire. */
export function TripQuote({
  tripId,
  pricePerKgCents,
  maxKg,
  homeDeliveryCents,
}: {
  tripId: string;
  pricePerKgCents: number;
  maxKg: number;
  homeDeliveryCents: number;
}) {
  const t = useT();
  const [weight, setWeight] = useState(Math.min(5, maxKg));
  const [delivery, setDelivery] = useState(false);
  const q = quote(pricePerKgCents, weight || 0.5, delivery ? homeDeliveryCents : 0);
  const suite = encodeURIComponent(`/trajets/${tripId}`);
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{t("Simulez votre envoi : aucun compte n'est nécessaire pour voir le prix.")}</p>
      <Field label={t("Poids du colis")} htmlFor="quote_kg" hint={t("Jusqu'à {maxKg} kg sur ce trajet", { maxKg })}>
        <div className="flex items-center gap-3">
          <Input
            id="quote_kg"
            type="number"
            min={0.5}
            max={maxKg}
            step={0.5}
            value={weight}
            onChange={(e) => setWeight(Math.min(maxKg, Number(e.target.value)))}
            className="w-28"
          />
          <span className="text-muted">{t("kg")}</span>
        </div>
      </Field>
      {homeDeliveryCents > 0 && (
        <label className="flex items-center gap-3 text-[15px]">
          <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="h-4 w-4 accent-brand" />
          {t("Livraison à domicile · +{euros}", { euros: euros(homeDeliveryCents) })}
        </label>
      )}
      <dl className="tabular space-y-2 rounded-2xl bg-paper p-4 text-[15px]">
        <div className="flex justify-between">
          <dt>{t("{v} kg × {euros}", { v: weight || 0, euros: euros(pricePerKgCents) })}</dt>
          <dd>{euros(q.baseCents)}</dd>
        </div>
        {q.deliveryCents > 0 && (
          <div className="flex justify-between">
            <dt>{t("Livraison à domicile")}</dt>
            <dd>{euros(q.deliveryCents)}</dd>
          </div>
        )}
        <div className="flex justify-between text-muted">
          <dt>{t("Frais de service")}</dt>
          <dd>{euros(q.feeCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-lg font-bold">
          <dt>{t("Total")}</dt>
          <dd>{euros(q.totalCents)}</dd>
        </div>
      </dl>
      <ul className="space-y-1.5 text-sm text-ink-soft">
        <li className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-brand" aria-hidden="true" /> {t("Vous ne payez qu'après l'accord du voyageur.")}
        </li>
        <li className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-brand" aria-hidden="true" /> {t("Le voyageur n'est payé qu'après la livraison.")}
        </li>
        <li className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-brand" aria-hidden="true" /> {t("Votre destinataire valide avec son code.")}
        </li>
      </ul>
      <ButtonLink href={`/inscription?suite=${suite}`} size="lg" className="w-full">
        {t("Créer mon compte pour réserver")}
      </ButtonLink>
      <p className="text-center text-sm text-muted">
        {t("Déjà inscrit ?")}{" "}
        <a href={`/connexion?suite=${suite}`} className="font-semibold text-brand">
          {t("Se connecter")}
        </a>
      </p>
    </div>
  );
}
