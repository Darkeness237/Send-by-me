"use client";

import { useActionState, useState } from "react";
import { publishTrip } from "@/app/actions/trips";
import { Button } from "@/components/ui/button";
import { submitKeepingValues } from "@/components/ui/keep-form";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { AIRLINES, airportsFor, FLIGHT_NUMBER_RE, normalizeFlightNumber } from "@/lib/flights";
import { PLACES } from "@/lib/places";
import { CATEGORIES, type TripMode } from "@/lib/types";

export function PublishForm() {
  const [state, action, pending] = useActionState(publishTrip, null);
  const [mode, setMode] = useState<TripMode>("plane");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [carrier, setCarrier] = useState("");
  const [flight, setFlight] = useState("");
  const [delivery, setDelivery] = useState(false);

  const fromAirports = airportsFor(fromCity);
  const toAirports = airportsFor(toCity);
  const flightNorm = normalizeFlightNumber(flight);
  const flightHint =
    flight && !FLIGHT_NUMBER_RE.test(flightNorm)
      ? "Format attendu : 2 caractères de la compagnie puis des chiffres, par exemple AF946."
      : flight && carrier && !flightNorm.startsWith(carrier)
        ? `Un vol ${AIRLINES.find((a) => a.code === carrier)?.name} commence par ${carrier}.`
        : "Tel qu'il figure sur votre billet ou carte d'embarquement.";

  const section = "space-y-5 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8";
  return (
    <form action={action} onSubmit={submitKeepingValues(action)} className="space-y-6">
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
            <Input id="from_city" name="from_city" list="places-publish" required autoComplete="off" placeholder="Paris" value={fromCity} onChange={(e) => setFromCity(e.target.value)} />
          </Field>
          <Field label="Ville d'arrivée" htmlFor="to_city">
            <Input id="to_city" name="to_city" list="places-publish" required autoComplete="off" placeholder="Douala" value={toCity} onChange={(e) => setToCity(e.target.value)} />
          </Field>
          <Field label="Date de départ" htmlFor="departure_date">
            <Input id="departure_date" name="departure_date" type="date" required />
          </Field>
          <Field label="Heure de départ" htmlFor="departure_time" hint="Heure locale de la ville de départ">
            <Input id="departure_time" name="departure_time" type="time" required defaultValue="10:00" />
          </Field>
          <Field label="Moyen de transport" htmlFor="mode">
            <Select id="mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value as TripMode)}>
              <option value="plane">Avion</option>
              <option value="car">Voiture</option>
              <option value="bus">Car</option>
              <option value="train">Train</option>
            </Select>
          </Field>
        </div>
      </fieldset>

      {mode === "plane" ? (
        <fieldset className={section}>
          <legend className="sr-only">Votre vol</legend>
          <div>
            <h2 className="text-lg font-bold">Votre vol</h2>
            <p className="mt-1 text-sm text-muted">
              Nous contrôlons automatiquement ces informations. Un vol cohérent rassure les expéditeurs et vous fait gagner des réservations.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Compagnie aérienne" htmlFor="carrier">
              <Select id="carrier" name="carrier" required value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                <option value="" disabled>
                  Choisir
                </option>
                {AIRLINES.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Numéro de vol" htmlFor="transport_ref" hint={flightHint}>
              <Input
                id="transport_ref"
                name="transport_ref"
                required
                maxLength={10}
                autoComplete="off"
                placeholder={carrier ? `${carrier}946` : "AF946"}
                value={flight}
                onChange={(e) => setFlight(e.target.value.toUpperCase())}
                className="uppercase"
              />
            </Field>
            <Field label="Aéroport de départ" htmlFor="from_airport">
              <Select id="from_airport" name="from_airport" required key={fromAirports.join()} defaultValue={fromAirports[0] ?? ""}>
                {fromAirports.length === 0 && <option value="">Choisissez d&apos;abord la ville de départ</option>}
                {fromAirports.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Aéroport d'arrivée finale" htmlFor="to_airport">
              <Select id="to_airport" name="to_airport" required key={toAirports.join()} defaultValue={toAirports[0] ?? ""}>
                {toAirports.length === 0 && <option value="">Choisissez d&apos;abord la ville d&apos;arrivée</option>}
                {toAirports.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Franchise bagage en soute (kg)" htmlFor="baggage_allowance_kg" hint="Indiquée sur votre billet, par exemple 2 × 23 kg = 46.">
              <Input id="baggage_allowance_kg" name="baggage_allowance_kg" type="number" min={0} max={200} step={1} required defaultValue={23} />
            </Field>
            <label className="flex items-center gap-3 self-end rounded-xl border border-line px-3.5 py-3 text-[15px] has-checked:border-brand has-checked:bg-brand-pale">
              <input type="checkbox" name="has_stopover" className="h-4 w-4 accent-brand" />
              Mon vol fait une escale
            </label>
          </div>
          <label className="flex items-start gap-3 text-sm text-ink-soft">
            <input type="checkbox" name="ticket_name_matches" required className="mt-0.5 h-4 w-4 accent-brand" />
            <span>Le nom sur mon billet est le même que sur la pièce d&apos;identité de mon compte.</span>
          </label>
        </fieldset>
      ) : mode !== "car" ? (
        <fieldset className={section}>
          <legend className="sr-only">Votre transport</legend>
          <h2 className="text-lg font-bold">{mode === "train" ? "Votre train" : "Votre car"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Compagnie" htmlFor="carrier">
              <Input id="carrier" name="carrier" required maxLength={80} placeholder={mode === "train" ? "SNCF, Eurostar…" : "FlixBus, BlaBlaCar Bus…"} />
            </Field>
            <Field label={mode === "train" ? "Numéro du train" : "Numéro de la ligne"} htmlFor="transport_ref" hint="Facultatif">
              <Input id="transport_ref" name="transport_ref" maxLength={20} autoComplete="off" />
            </Field>
          </div>
        </fieldset>
      ) : null}

      <fieldset className={section}>
        <legend className="sr-only">Kilos et prix</legend>
        <h2 className="text-lg font-bold">Vos kilos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kilos disponibles" htmlFor="capacity_kg">
            <Input id="capacity_kg" name="capacity_kg" type="number" min={1} max={100} step={0.5} required defaultValue={10} />
          </Field>
          <Field label="Prix au kilo (€)" htmlFor="price_per_kg" hint="C'est ce que vous recevez. Les frais de service sont payés par l'expéditeur.">
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

        <div className="rounded-2xl border border-line p-4 has-[input[name=home_delivery]:checked]:border-brand">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="home_delivery" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="mt-1 h-4 w-4 accent-brand" />
            <span>
              <span className="block font-semibold">Je propose la livraison à domicile</span>
              <span className="block text-sm text-muted">L&apos;expéditeur peut la choisir en option. Le forfait vous revient en entier.</span>
            </span>
          </label>
          {delivery && (
            <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
              <Field label="Forfait (€)" htmlFor="home_delivery_price">
                <Input id="home_delivery_price" name="home_delivery_price" type="number" min={1} max={100} step={0.5} required defaultValue={10} />
              </Field>
              <Field label="Zone desservie" htmlFor="home_delivery_area" hint="Quartiers ou villes où vous pouvez livrer.">
                <Input id="home_delivery_area" name="home_delivery_area" required maxLength={200} placeholder="Douala : Akwa, Bonapriso, Bonamoussadi" />
              </Field>
            </div>
          )}
        </div>

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
