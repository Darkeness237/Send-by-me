"use client";

import { useActionState, useState } from "react";
import { publishTrip } from "@/app/actions/trips";
import { Button } from "@/components/ui/button";
import { submitKeepingValues } from "@/components/ui/keep-form";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { splitCity, useCitySearch } from "@/components/use-city-search";
import { AIRLINES, FLIGHT_NUMBER_RE, normalizeFlightNumber } from "@/lib/flights";
import { priceGuide, priceLevel, type MarketPrice } from "@/lib/price-guide";
import { euros } from "@/lib/pricing";
import { CATEGORIES, type TripMode } from "@/lib/types";

const LEVEL = {
  attractive: { label: "Prix attractif : vous recevrez plus de demandes", bar: "bg-ok", text: "text-ok" },
  fair: { label: "Prix juste, dans la moyenne de la ligne", bar: "bg-ok", text: "text-ok" },
  high: { label: "Au-dessus du prix conseillé : vous risquez de recevoir moins de demandes", bar: "bg-signal", text: "text-signal-deep" },
  over: { label: "Trop élevé : le prix maximum sur cette ligne est dépassé", bar: "bg-danger", text: "text-danger" },
} as const;

export function PublishForm({ market }: { market: MarketPrice[] }) {
  const [state, action, pending] = useActionState(publishTrip, null);
  const [mode, setMode] = useState<TripMode>("plane");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [carrier, setCarrier] = useState("");
  const [flight, setFlight] = useState("");
  const [price, setPrice] = useState(9);
  const from = useCitySearch(fromCity);
  const to = useCitySearch(toCity);
  const guide = priceGuide(splitCity(fromCity).city, splitCity(toCity).city, mode, market);
  const priceCents = Math.round((price || 0) * 100);
  const level = priceLevel(priceCents, guide);

  const fromAirports = from.selected?.airports ?? [];
  const toAirports = to.selected?.airports ?? [];
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
      {[
        ["cities-from", from.options],
        ["cities-to", to.options],
      ].map(([id, list]) => (
        <datalist key={id as string} id={id as string}>
          {(list as typeof from.options).map((o) => (
            <option key={`${o.city}-${o.country}`} value={`${o.city}, ${o.country}`}>
              {o.airports.map((a) => a.iata).join(" · ")}
            </option>
          ))}
        </datalist>
      ))}

      <fieldset className={section}>
        <legend className="sr-only">Trajet</legend>
        <h2 className="text-lg font-bold">Votre trajet</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville de départ" htmlFor="from_city" hint="Toutes les villes desservies par un aéroport, dans le monde entier.">
            <Input id="from_city" name="from_city" list="cities-from" required autoComplete="off" placeholder="Paris, France" value={fromCity} onChange={(e) => setFromCity(e.target.value)} />
          </Field>
          <Field label="Ville d'arrivée" htmlFor="to_city">
            <Input id="to_city" name="to_city" list="cities-to" required autoComplete="off" placeholder="Douala, Cameroun" value={toCity} onChange={(e) => setToCity(e.target.value)} />
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
              <Select id="from_airport" name="from_airport" required key={fromAirports.map((a) => a.iata).join()} defaultValue={fromAirports[0]?.iata ?? ""}>
                {fromAirports.length === 0 && <option value="">Choisissez d&apos;abord la ville de départ</option>}
                {fromAirports.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.iata} · {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Aéroport d'arrivée finale" htmlFor="to_airport">
              <Select id="to_airport" name="to_airport" required key={toAirports.map((a) => a.iata).join()} defaultValue={toAirports[0]?.iata ?? ""}>
                {toAirports.length === 0 && <option value="">Choisissez d&apos;abord la ville d&apos;arrivée</option>}
                {toAirports.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.iata} · {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bagages inclus dans le billet (kg)" htmlFor="baggage_allowance_kg" hint="Facultatif. Vous pouvez proposer plus si vous ajoutez des valises.">
              <Input id="baggage_allowance_kg" name="baggage_allowance_kg" type="number" min={0} max={200} step={1} />
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
          <Field label="Kilos disponibles" htmlFor="capacity_kg" hint="Toutes vos valises comprises, jusqu'à 300 kg.">
            <Input id="capacity_kg" name="capacity_kg" type="number" min={1} max={300} step={0.5} required defaultValue={10} />
          </Field>
          <Field label="Prix au kilo (€)" htmlFor="price_per_kg" hint="C'est ce que vous recevez par kilo.">
            <Input
              id="price_per_kg"
              name="price_per_kg"
              type="number"
              min={1}
              max={guide.maxCents / 100}
              step={0.5}
              required
              value={price || ""}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="rounded-2xl bg-paper p-4" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">
              Prix conseillé : {euros(guide.lowCents)} à {euros(guide.highCents)} le kilo
            </p>
            <p className="text-sm text-muted">
              {guide.source === "market" ? `D'après ${guide.sample} annonces sur cette ligne` : "Estimation pour ce type de trajet"}
            </p>
          </div>
          {/* Jauge : zone conseillée au centre, plafond à droite */}
          <div className="relative mt-3 h-2 rounded-full bg-line" aria-hidden="true">
            <span
              className="absolute inset-y-0 rounded-full bg-ok/40"
              style={{ left: `${(guide.lowCents / guide.maxCents) * 100}%`, width: `${((guide.highCents - guide.lowCents) / guide.maxCents) * 100}%` }}
            />
            <span
              className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${LEVEL[level].bar}`}
              style={{ left: `${Math.min(100, (priceCents / guide.maxCents) * 100)}%` }}
            />
          </div>
          <p className={`mt-3 text-sm font-semibold ${LEVEL[level].text}`}>{LEVEL[level].label}</p>
          <p className="mt-1 text-sm text-ink-soft">
            Pour 5 kg, vous recevez <span className="font-semibold">{euros(priceCents * 5)}</span>. Maximum autorisé : {euros(guide.maxCents)} le kilo.
          </p>
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

        <p className="rounded-2xl bg-paper px-4 py-3 text-sm text-ink-soft">
          Si le destinataire ne peut pas venir au point de rendez-vous, l&apos;expéditeur peut choisir la livraison à domicile : elle est
          assurée par le partenaire de livraison de Send By Me, à qui vous remettez simplement le colis à votre arrivée.
        </p>

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
