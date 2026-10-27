"use client";

import { useActionState, useState } from "react";
import { requestBooking } from "@/app/actions/bookings";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { submitKeepingValues } from "@/components/ui/keep-form";
import { COMMISSION_TIERS, euros, percent, quote } from "@/lib/pricing";
import { CATEGORIES } from "@/lib/types";

type Props = {
  tripId: string;
  pricePerKgCents: number;
  maxKg: number;
  acceptedCategories: string[];
  homeDeliveryCents?: number | null;
  homeDeliveryArea?: string | null;
};

export function BookingForm({ tripId, pricePerKgCents, maxKg, acceptedCategories, homeDeliveryCents, homeDeliveryArea }: Props) {
  const [state, action, pending] = useActionState(requestBooking, null);
  const [weight, setWeight] = useState(Math.min(5, maxKg));
  const [delivery, setDelivery] = useState(false);
  const q = quote(pricePerKgCents, weight || 0.5, delivery && homeDeliveryCents ? homeDeliveryCents : 0);
  const categories = CATEGORIES.filter((c) => acceptedCategories.includes(c.id));

  return (
    <form action={action} onSubmit={submitKeepingValues(action)} className="space-y-5">
      <input type="hidden" name="trip_id" value={tripId} />
      <Field label="Poids du colis" htmlFor="weight_kg" hint={`Jusqu'à ${maxKg} kg sur ce trajet`}>
        <div className="flex items-center gap-3">
          <Input
            id="weight_kg"
            name="weight_kg"
            type="number"
            min={0.5}
            max={maxKg}
            step={0.5}
            required
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-28"
          />
          <span className="text-muted">kg</span>
        </div>
      </Field>
      <Field label="Type de colis" htmlFor="category">
        <Select id="category" name="category" required defaultValue="">
          <option value="" disabled>
            Choisir
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Contenu" htmlFor="description" hint="Soyez précis : le voyageur vérifiera le colis avant de le fermer.">
        <Textarea id="description" name="description" required minLength={3} maxLength={500} placeholder="2 robes, 1 paire de chaussures, des livres scolaires" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Destinataire" htmlFor="recipient_name">
          <Input id="recipient_name" name="recipient_name" required maxLength={80} autoComplete="off" placeholder="Prénom Nom" />
        </Field>
        <Field label="Téléphone du destinataire" htmlFor="recipient_phone">
          <Input id="recipient_phone" name="recipient_phone" type="tel" required placeholder="+237 6 99 00 00 00" autoComplete="off" />
        </Field>
      </div>

      {homeDeliveryCents ? (
        <div className="rounded-2xl border border-line p-4 has-checked:border-brand has-checked:bg-brand-pale/40">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="home_delivery"
              checked={delivery}
              onChange={(e) => setDelivery(e.target.checked)}
              className="mt-1 h-4 w-4 accent-brand"
            />
            <span>
              <span className="block font-semibold">Livraison à domicile · +{euros(homeDeliveryCents)}</span>
              <span className="block text-sm text-muted">
                Le voyageur apporte le colis chez le destinataire{homeDeliveryArea ? ` (${homeDeliveryArea})` : ""}.
              </span>
            </span>
          </label>
          {delivery && (
            <Field label="Adresse de livraison" htmlFor="delivery_address" hint="Visible uniquement par le voyageur de cette réservation.">
              <Textarea id="delivery_address" name="delivery_address" required minLength={5} maxLength={300} rows={2} placeholder="Quartier, rue, point de repère" />
            </Field>
          )}
        </div>
      ) : null}

      <label className="flex items-start gap-3 text-sm text-ink-soft">
        <input type="checkbox" name="declaration" required className="mt-0.5 h-4 w-4 accent-brand" />
        <span>
          Je certifie que mon colis ne contient aucun{" "}
          <a href="/objets-interdits" target="_blank" className="font-semibold text-brand underline-offset-2 hover:underline">
            objet interdit
          </a>{" "}
          et que je le montrerai ouvert au voyageur.
        </span>
      </label>

      <dl className="tabular space-y-2 rounded-2xl bg-paper p-4 text-[15px]">
        <div className="flex justify-between">
          <dt>
            {weight || 0} kg × {euros(pricePerKgCents)}
          </dt>
          <dd>{euros(q.baseCents)}</dd>
        </div>
        {q.deliveryCents > 0 && (
          <div className="flex justify-between">
            <dt>Livraison à domicile</dt>
            <dd>{euros(q.deliveryCents)}</dd>
          </div>
        )}
        <div className="flex justify-between text-muted">
          <dt>Frais de service</dt>
          <dd>{euros(q.feeCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-lg font-bold">
          <dt>Total</dt>
          <dd>{euros(q.totalCents)}</dd>
        </div>
      </dl>

      <details className="text-sm text-muted">
        <summary className="cursor-pointer font-semibold text-ink-soft">Comment sont calculés les frais ?</summary>
        <p className="mt-2">
          Le voyageur reçoit {euros(q.payoutCents)}. Les frais de service comprennent notre commission (
          {percent(q.commissionRate)} pour ce poids) et les frais bancaires du paiement sécurisé. Plus le colis est lourd, plus le taux baisse :
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 tabular">
          {COMMISSION_TIERS.map((t, i) => (
            <li key={t.upToKg} className={t.rate === q.commissionRate ? "font-semibold text-ink" : ""}>
              {t.upToKg === Infinity ? `Plus de ${COMMISSION_TIERS[i - 1].upToKg} kg` : `Jusqu'à ${t.upToKg} kg`} : {percent(t.rate)}
            </li>
          ))}
        </ul>
      </details>

      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer ma demande"}
      </Button>
      <p className="text-center text-sm text-muted">Vous ne payez qu&apos;après l&apos;accord du voyageur.</p>
    </form>
  );
}
