"use client";

import { useActionState } from "react";
import { publishTrip } from "@/app/actions/trips";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { PLACES } from "@/lib/places";
import { CATEGORIES } from "@/lib/types";

export function PublishForm() {
  const [state, action, pending] = useActionState(publishTrip, null);

  const section = "space-y-5 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8";
  return (
    <form action={action} className="space-y-6">
      <datalist id="places-publish">
        {PLACES.map((p) => (
          <option key={p.slug} value={p.city}>
            {p.country}
          </option>
        ))}
      </datalist>

      <fieldset className={section}>
        <legend className="sr-only">Trajet</legend>
        <h2 className="text-lg font-bold">Votre trajet</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville de départ" htmlFor="from_city">
            <Input id="from_city" name="from_city" list="places-publish" required autoComplete="off" placeholder="Paris" />
          </Field>
          <Field label="Ville d'arrivée" htmlFor="to_city">
            <Input id="to_city" name="to_city" list="places-publish" required autoComplete="off" placeholder="Douala" />
          </Field>
          <Field label="Date de départ" htmlFor="departure_date">
            <Input id="departure_date" name="departure_date" type="date" required />
          </Field>
          <Field label="Heure de départ" htmlFor="departure_time" hint="Heure locale de la ville de départ">
            <Input id="departure_time" name="departure_time" type="time" required defaultValue="10:00" />
          </Field>
          <Field label="Moyen de transport" htmlFor="mode">
            <Select id="mode" name="mode" defaultValue="plane">
              <option value="plane">Avion</option>
              <option value="car">Voiture</option>
              <option value="bus">Car</option>
              <option value="train">Train</option>
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className="sr-only">Kilos et prix</legend>
        <h2 className="text-lg font-bold">Vos kilos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kilos disponibles" htmlFor="capacity_kg">
            <Input id="capacity_kg" name="capacity_kg" type="number" min={1} max={100} step={0.5} required defaultValue={10} />
          </Field>
          <Field label="Prix au kilo (€)" htmlFor="price_per_kg" hint="Comparez avec les autres trajets sur la même ligne avant de fixer votre prix.">
            <Input id="price_per_kg" name="price_per_kg" type="number" min={1} max={100} step={0.5} required defaultValue={9} />
          </Field>
        </div>
        <div>
          <p className="text-sm font-semibold">Colis que vous acceptez</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <label key={c.id} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-[15px] has-checked:border-brand has-checked:bg-brand-pale">
                <input type="checkbox" name="accepted_categories" value={c.id} defaultChecked={c.id !== "medication"} className="h-4 w-4 accent-brand" />
                {c.label}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className="sr-only">Remise</legend>
        <h2 className="text-lg font-bold">Remise et récupération</h2>
        <Field label="Où les expéditeurs vous remettent le colis" htmlFor="pickup_note">
          <Input id="pickup_note" name="pickup_note" maxLength={300} placeholder="Près de la gare de Lyon, la veille du départ" />
        </Field>
        <Field label="Où le destinataire le récupère" htmlFor="dropoff_note">
          <Input id="dropoff_note" name="dropoff_note" maxLength={300} placeholder="À Akwa, le lendemain de mon arrivée" />
        </Field>
        <Field label="Un mot pour les expéditeurs" htmlFor="notes" hint="Facultatif. Vos règles : colis ouverts, pas de liquides…">
          <Textarea id="notes" name="notes" maxLength={1000} />
        </Field>
      </fieldset>

      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Publication…" : "Publier mon trajet"}
      </Button>
    </form>
  );
}
