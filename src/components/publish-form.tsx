"use client";

import { ArrowLeft, PlaneTakeoff } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { publishTrip } from "@/app/actions/trips";
import { TripPreview } from "@/components/publish-previews";
import { Button } from "@/components/ui/button";
import { submitKeepingValues } from "@/components/ui/keep-form";
import {
  Field,
  FormMessage,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { splitCity, useCitySearch } from "@/components/use-city-search";
import {
  AIRLINES,
  FLIGHT_NUMBER_RE,
  normalizeFlightNumber,
} from "@/lib/flights";
import { priceGuide, priceLevel, type MarketPrice } from "@/lib/price-guide";
import { euros } from "@/lib/pricing";
import { CATEGORIES, groupedCategories, type TripMode } from "@/lib/types";
import { useT } from "@/i18n/client";

const LEVEL = {
  attractive: {
    label: "Prix attractif : vous recevrez plus de demandes",
    bar: "bg-ok",
    text: "text-ok",
  },
  fair: {
    label: "Prix juste, dans la moyenne de la ligne",
    bar: "bg-ok",
    text: "text-ok",
  },
  high: {
    label:
      "Au-dessus du prix conseillé : vous risquez de recevoir moins de demandes",
    bar: "bg-signal",
    text: "text-signal-deep",
  },
  over: {
    label: "Trop élevé : le prix maximum sur cette ligne est dépassé",
    bar: "bg-danger",
    text: "text-danger",
  },
} as const;

export function PublishForm({ market }: { market: MarketPrice[] }) {
  const t = useT();
  const [state, action, pending] = useActionState(publishTrip, null);
  const [mode, setMode] = useState<TripMode>("plane");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [carrier, setCarrier] = useState("");
  const [flight, setFlight] = useState("");
  const [price, setPrice] = useState(9);
  // Trois écrans courts : trajet, kilos et prix, remise. Les champs restent dans le formulaire.
  const [stage, setStage] = useState(0);
  const stages = useRef<(HTMLDivElement | null)[]>([]);
  const next = () => {
    const box = stages.current[stage];
    const invalid = box
      ? [
          ...box.querySelectorAll<HTMLInputElement>("input, select, textarea"),
        ].find((el) => !el.checkValidity())
      : null;
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    setStage((n) => Math.min(2, n + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const STAGE_LABELS = [
    t("Votre trajet"),
    t("Vos kilos et votre prix"),
    t("Remise du colis"),
  ];
  const [values, setValues] = useState<Record<string, string>>({
    capacity_kg: "10",
    departure_time: "10:00",
  });
  const from = useCitySearch(fromCity);
  const to = useCitySearch(toCity);
  const guide = priceGuide(
    splitCity(fromCity).city,
    splitCity(toCity).city,
    mode,
    market,
    {
      from: from.selected?.country || splitCity(fromCity).country,
      to: to.selected?.country || splitCity(toCity).country,
    },
  );
  const priceCents = Math.round((price || 0) * 100);
  const level = priceLevel(priceCents, guide);

  const fromAirports = from.selected?.airports ?? [];
  const toAirports = to.selected?.airports ?? [];
  const flightNorm = normalizeFlightNumber(flight);
  const flightHint =
    flight && !FLIGHT_NUMBER_RE.test(flightNorm)
      ? t("Format attendu : 2 caractères de la compagnie puis des chiffres, par exemple AF946.")
      : flight && carrier && !flightNorm.startsWith(carrier)
        ? t("Un vol {airline} commence par {carrier}.", { airline: AIRLINES.find((a) => a.code === carrier)?.name ?? "", carrier })
        : t("Tel qu'il figure sur votre billet ou carte d'embarquement.");

  const preview = (
    <TripPreview
      from={fromCity}
      to={toCity}
      fromIata={
        (
          fromAirports.find((a) => a.iata === values.from_airport) ??
          fromAirports[0]
        )?.iata
      }
      toIata={
        (toAirports.find((a) => a.iata === values.to_airport) ?? toAirports[0])
          ?.iata
      }
      date={values.departure_date}
      time={values.departure_time}
      mode={mode}
      flight={flightNorm}
      kg={Number(values.capacity_kg) || 0}
      priceCents={priceCents}
    />
  );

  const section =
    "reveal space-y-5 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8";
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <form
        action={action}
        onSubmit={submitKeepingValues(action)}
        onChange={(e) => {
          const el = e.target as unknown as HTMLInputElement;
          if (el.name) setValues((v) => ({ ...v, [el.name]: el.value }));
        }}
        className="space-y-6"
      >
        {[
          ["cities-from", from.options],
          ["cities-to", to.options],
        ].map(([id, list]) => (
          <datalist key={id as string} id={id as string}>
            {(list as typeof from.options).map((o) => (
              <option
                key={`${o.city}-${o.country}`}
                value={`${o.city}, ${o.country}`}
              >
                {o.airports.map((a) => a.iata).join(" · ")}
              </option>
            ))}
          </datalist>
        ))}

        <ol className="flex gap-2" aria-label={t("Étapes de la publication")}>
          {STAGE_LABELS.map((label, i) => (
            <li key={label} className="flex-1">
              <span
                className={`block h-1.5 rounded-full ${i <= stage ? "bg-brand" : "bg-line"}`}
                aria-hidden="true"
              />
              <span
                className={`mt-1.5 block text-xs ${i === stage ? "font-semibold text-ink" : "text-muted"}`}
                aria-current={i === stage ? "step" : undefined}
              >
                {i + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        <div
          ref={(el) => {
            stages.current[0] = el;
          }}
          hidden={stage !== 0}
          className="space-y-6"
        >
          <fieldset className={section}>
            <legend className="sr-only">{t("Trajet")}</legend>
            <h2 className="flex items-center gap-3 text-lg font-bold">
              <Step n={1} />
              {t("Votre trajet")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Ville de départ")} htmlFor="from_city">
                <Input
                  id="from_city"
                  name="from_city"
                  list="cities-from"
                  required
                  autoComplete="off"
                  placeholder={t("Paris, France")}
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                />
              </Field>
              <Field label={t("Ville d'arrivée")} htmlFor="to_city">
                <Input
                  id="to_city"
                  name="to_city"
                  list="cities-to"
                  required
                  autoComplete="off"
                  placeholder={t("Douala, Cameroun")}
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                />
              </Field>
              <Field label={t("Date de départ")} htmlFor="departure_date">
                <Input
                  id="departure_date"
                  name="departure_date"
                  type="date"
                  required
                />
              </Field>
              <Field
                label={t("Heure de départ")}
                htmlFor="departure_time"
                hint={t("Heure locale de la ville de départ")}
              >
                <Input
                  id="departure_time"
                  name="departure_time"
                  type="time"
                  required
                  defaultValue="10:00"
                />
              </Field>
              <Field
                label={t("Arrivée prévue")}
                htmlFor="arrival_date"
                hint={t("Heure locale de la ville d'arrivée. Le suivi des colis passe seul à « Arrivé » à cette heure.")}
              >
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    id="arrival_date"
                    name="arrival_date"
                    type="date"
                    aria-label={t("Date d'arrivée")}
                  />
                  <Input
                    id="arrival_time"
                    name="arrival_time"
                    type="time"
                    aria-label={t("Heure d'arrivée")}
                  />
                </div>
              </Field>
              <Field label={t("Moyen de transport")} htmlFor="mode">
                <Select
                  id="mode"
                  name="mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as TripMode)}
                >
                  <option value="plane">{t("Avion")}</option>
                  <option value="car">{t("Voiture")}</option>
                  <option value="bus">{t("Car")}</option>
                  <option value="train">{t("Train")}</option>
                </Select>
              </Field>
            </div>
          </fieldset>

          {mode === "plane" ? (
            <fieldset className={`${section} reveal-delay-1`}>
              <legend className="sr-only">{t("Votre vol")}</legend>
              <div>
                <h2 className="flex items-center gap-3 text-lg font-bold">
                  <Step n={2} />
                  {t("Votre vol")}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {t("Les expéditeurs réservent plus volontiers quand le vol est renseigné.")}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("Compagnie aérienne")} htmlFor="carrier">
                  <Select
                    id="carrier"
                    name="carrier"
                    required
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                  >
                    <option value="" disabled>
                      {t("Choisir")}
                    </option>
                    {AIRLINES.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.name} ({a.code})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label={t("Numéro de vol")}
                  htmlFor="transport_ref"
                  hint={flightHint}
                >
                  <Input
                    id="transport_ref"
                    name="transport_ref"
                    required
                    maxLength={10}
                    autoComplete="off"
                    placeholder={carrier ? `${carrier}946` : t("AF946")}
                    value={flight}
                    onChange={(e) => setFlight(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                </Field>
                <Field label={t("Aéroport de départ")} htmlFor="from_airport">
                  <Select
                    id="from_airport"
                    name="from_airport"
                    required
                    key={fromAirports.map((a) => a.iata).join()}
                    defaultValue={fromAirports[0]?.iata ?? ""}
                  >
                    {fromAirports.length === 0 && (
                      <option value="">
                        {t("Choisissez d'abord la ville de départ")}
                      </option>
                    )}
                    {fromAirports.map((a) => (
                      <option key={a.iata} value={a.iata}>
                        {a.iata} · {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("Aéroport d'arrivée finale")} htmlFor="to_airport">
                  <Select
                    id="to_airport"
                    name="to_airport"
                    required
                    key={toAirports.map((a) => a.iata).join()}
                    defaultValue={toAirports[0]?.iata ?? ""}
                  >
                    {toAirports.length === 0 && (
                      <option value="">
                        {t("Choisissez d'abord la ville d'arrivée")}
                      </option>
                    )}
                    {toAirports.map((a) => (
                      <option key={a.iata} value={a.iata}>
                        {a.iata} · {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label={t("Bagages inclus dans le billet (kg)")}
                  htmlFor="baggage_allowance_kg"
                  hint={t("Facultatif. Vous pouvez proposer plus si vous ajoutez des valises.")}
                >
                  <Input
                    id="baggage_allowance_kg"
                    name="baggage_allowance_kg"
                    type="number"
                    min={0}
                    max={200}
                    step={1}
                  />
                </Field>
                <label className="flex items-center gap-3 self-end rounded-xl border border-line px-3.5 py-3 text-[15px] has-checked:border-brand has-checked:bg-brand-pale">
                  <input
                    type="checkbox"
                    name="has_stopover"
                    className="h-4 w-4 accent-brand"
                  />
                  {t("Mon vol fait une escale")}
                </label>
              </div>
              <label className="flex items-start gap-3 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="ticket_name_matches"
                  required
                  className="mt-0.5 h-4 w-4 accent-brand"
                />
                <span>
                  {t("Le nom sur mon billet est le même que sur la pièce d'identité de mon compte.")}
                </span>
              </label>
            </fieldset>
          ) : mode !== "car" ? (
            <fieldset className={section}>
              <legend className="sr-only">{t("Votre transport")}</legend>
              <h2 className="flex items-center gap-3 text-lg font-bold">
                <Step n={2} />
                {mode === "train" ? t("Votre train") : t("Votre car")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("Compagnie")} htmlFor="carrier">
                  <Input
                    id="carrier"
                    name="carrier"
                    required
                    maxLength={80}
                    placeholder={
                      mode === "train"
                        ? t("SNCF, Eurostar…")
                        : t("FlixBus, BlaBlaCar Bus…")
                    }
                  />
                </Field>
                <Field
                  label={
                    mode === "train" ? t("Numéro du train") : t("Numéro de la ligne")
                  }
                  htmlFor="transport_ref"
                  hint={t("Facultatif")}
                >
                  <Input
                    id="transport_ref"
                    name="transport_ref"
                    maxLength={20}
                    autoComplete="off"
                  />
                </Field>
              </div>
            </fieldset>
          ) : null}
        </div>

        <div
          ref={(el) => {
            stages.current[1] = el;
          }}
          hidden={stage !== 1}
          className="space-y-6"
        >
          <fieldset className={`${section} reveal-delay-2`}>
            <legend className="sr-only">{t("Kilos et prix")}</legend>
            <h2 className="flex items-center gap-3 text-lg font-bold">
              <Step n={mode === "car" ? 2 : 3} />
              {t("Vos kilos")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("Kilos disponibles")}
                htmlFor="capacity_kg"
                hint={t("Toutes vos valises comprises, jusqu'à 300 kg.")}
              >
                <Input
                  id="capacity_kg"
                  name="capacity_kg"
                  type="number"
                  min={1}
                  max={300}
                  step={0.5}
                  required
                  defaultValue={10}
                />
              </Field>
              <Field
                label={t("Prix au kilo (€)")}
                htmlFor="price_per_kg"
                hint={t("C'est ce que vous recevez par kilo.")}
              >
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
                  {t("Prix conseillé : {euros} à", { euros: euros(guide.lowCents) })}{" "}
                  {t("{euros} le kilo", { euros: euros(guide.highCents) })}
                </p>
                <p className="text-sm text-muted">
                  {guide.source === "market"
                    ? t("D'après {n} annonces sur cette ligne", { n: guide.sample })
                    : t("Estimation pour ce type de trajet")}
                </p>
              </div>
              {/* Jauge : zone conseillée au centre, plafond à droite */}
              <div
                className="relative mt-3 h-2 rounded-full bg-line"
                aria-hidden="true"
              >
                <span
                  className="absolute inset-y-0 rounded-full bg-ok/40"
                  style={{
                    left: `${(guide.lowCents / guide.maxCents) * 100}%`,
                    width: `${((guide.highCents - guide.lowCents) / guide.maxCents) * 100}%`,
                  }}
                />
                <span
                  className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${LEVEL[level].bar}`}
                  style={{
                    left: `${Math.min(100, (priceCents / guide.maxCents) * 100)}%`,
                  }}
                />
              </div>
              <p className={`mt-3 text-sm font-semibold ${LEVEL[level].text}`}>
                {t(LEVEL[level].label)}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {t("Pour 5 kg, vous recevez")}{" "}
                <span className="font-semibold">{euros(priceCents * 5)}</span>{t(". Maximum autorisé : {euros} le kilo.", { euros: euros(guide.maxCents) })}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">{t("Colis que vous acceptez")}</p>
              <p className="mt-1 text-sm text-muted">
                {t("Tout est coché sauf les médicaments : décochez ce que vous ne voulez pas transporter.")}
              </p>
              {groupedCategories(CATEGORIES).map((g) => (
                <div key={g.group} className="mt-4">
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                    {t(g.group)}
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {g.items.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-[15px] has-checked:border-brand has-checked:bg-brand-pale"
                      >
                        <input
                          type="checkbox"
                          name="accepted_categories"
                          value={c.id}
                          defaultChecked={c.id !== "medication"}
                          className="h-4 w-4 accent-brand"
                        />
                        {t(c.label)}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        <div
          ref={(el) => {
            stages.current[2] = el;
          }}
          hidden={stage !== 2}
          className="space-y-6"
        >
          <fieldset className={`${section} reveal-delay-3`}>
            <legend className="sr-only">{t("Remise")}</legend>
            <h2 className="flex items-center gap-3 text-lg font-bold">
              <Step n={mode === "car" ? 3 : 4} />
              {t("Remise et récupération")}
            </h2>
            <Field
              label={t("Où les expéditeurs vous remettent le colis")}
              htmlFor="pickup_note"
            >
              <Input
                id="pickup_note"
                name="pickup_note"
                maxLength={300}
                placeholder={t("Près de la gare de Lyon, la veille du départ")}
              />
            </Field>
            <Field
              label={t("Où le destinataire le récupère")}
              htmlFor="dropoff_note"
            >
              <Input
                id="dropoff_note"
                name="dropoff_note"
                maxLength={300}
                placeholder={t("À Akwa, le lendemain de mon arrivée")}
              />
            </Field>

            <Field
              label={t("Un mot pour les expéditeurs")}
              htmlFor="notes"
              hint={t("Facultatif. Par exemple : colis ouverts uniquement, pas de liquides.")}
            >
              <Textarea id="notes" name="notes" maxLength={1000} />
            </Field>
          </fieldset>

          <div className="lg:hidden">{preview}</div>
        </div>
        <FormMessage state={state} />
        <div className="flex flex-wrap gap-3">
          {stage > 0 && (
            <Button
              key="back"
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setStage((n) => n - 1)}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              {t("Retour")}
            </Button>
          )}
          {stage < 2 ? (
            <Button key="next" type="button" size="lg" onClick={next}>
              {t("Suivant")}
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              disabled={pending}
            >
              <PlaneTakeoff className="h-5 w-5" aria-hidden="true" />
              {pending ? t("Publication…") : t("Publier mon trajet")}
            </Button>
          )}
        </div>
      </form>
      <aside
        className="reveal reveal-delay-2 hidden lg:sticky lg:top-6 lg:block"
        aria-label={t("Aperçu de votre annonce")}
      >
        {preview}
        <p className="mt-4 text-center text-sm text-muted">
          {t("Voici ce que verront les expéditeurs.")}
        </p>
      </aside>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span
      className="wide tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-signal"
      aria-hidden="true"
    >
      {n}
    </span>
  );
}
