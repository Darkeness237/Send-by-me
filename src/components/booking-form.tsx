"use client";

import { useActionState, useState } from "react";
import { requestBooking } from "@/app/actions/bookings";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { euros, quote } from "@/lib/pricing";
import { CATEGORIES } from "@/lib/types";

type Props = {
  tripId: string;
  pricePerKgCents: number;
  maxKg: number;
  acceptedCategories: string[];
};

export function BookingForm({ tripId, pricePerKgCents, maxKg, acceptedCategories }: Props) {
  const [state, action, pending] = useActionState(requestBooking, null);
  const [weight, setWeight] = useState(Math.min(5, maxKg));
  const q = quote(pricePerKgCents, weight || 0.5);
  const categories = CATEGORIES.filter((c) => acceptedCategories.includes(c.id));

  return (
    <form action={action} className="space-y-5">
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
        <div className="flex justify-between text-muted">
          <dt>Frais de service</dt>
          <dd>{euros(q.feeCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-lg font-bold">
          <dt>Total</dt>
          <dd>{euros(q.totalCents)}</dd>
        </div>
      </dl>

      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer ma demande"}
      </Button>
      <p className="text-center text-sm text-muted">Vous ne payez qu&apos;après l&apos;accord du voyageur.</p>
    </form>
  );
}
