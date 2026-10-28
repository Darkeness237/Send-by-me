"use client";

import { Bus, Car, Home, Plane, TrainFront } from "lucide-react";
import { RouteArc } from "@/components/journey";
import { euros } from "@/lib/pricing";
import { CATEGORIES, type TripMode } from "@/lib/types";
import { useLocale, useT } from "@/i18n/client";
import { intlLocale, type Locale, type T } from "@/i18n/config";

const MODE_ICON = {
  plane: Plane,
  car: Car,
  bus: Bus,
  train: TrainFront,
} as const;
const MODE_LABEL = {
  plane: "Avion",
  car: "Voiture",
  bus: "Car",
  train: "Train",
} as const;

function code(city: string, iata?: string) {
  if (iata) return iata;
  const c = city.split(",")[0].trim();
  return c
    ? c.normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 3).toUpperCase()
    : "···";
}

function dateLabel(t: T, lang: Locale, value?: string) {
  if (!value) return t("Date à choisir");
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(intlLocale(lang), {
        weekday: "short",
        day: "numeric",
        month: "long",
      });
}

function Codes({
  from,
  to,
  fromCode,
  toCode,
  dark,
}: {
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  dark?: boolean;
}) {
  const t = useT();
  const ready = Boolean(from && to);
  const muted = dark ? "text-white/70" : "text-ink-soft";
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-end gap-2">
      <div className="min-w-0">
        <p
          key={fromCode}
          className={`display pop-in text-4xl ${dark ? "text-signal" : "text-ink"}`}
        >
          {fromCode}
        </p>
        <p className={`truncate text-sm ${muted}`}>
          {from.split(",")[0] || t("Départ")}
        </p>
      </div>
      <RouteArc
        className="mb-5 w-full"
        flying={ready}
        tone={dark ? "light" : "dark"}
      />
      <div className="min-w-0 text-right">
        <p
          key={toCode}
          className={`display pop-in text-4xl ${dark ? "text-signal" : "text-ink"}`}
        >
          {toCode}
        </p>
        <p className={`truncate text-sm ${muted}`}>
          {to.split(",")[0] || t("Arrivée")}
        </p>
      </div>
    </div>
  );
}

/** Aperçu de l'annonce, sous forme de carte d'embarquement, mis à jour pendant la saisie. */
export function TripPreview({
  from,
  to,
  fromIata,
  toIata,
  date,
  time,
  mode,
  flight,
  kg,
  priceCents,
}: {
  from: string;
  to: string;
  fromIata?: string;
  toIata?: string;
  date?: string;
  time?: string;
  mode: TripMode;
  flight?: string;
  kg: number;
  priceCents: number;
}) {
  const t = useT();
  const lang = useLocale();
  const Icon = MODE_ICON[mode];
  const total = Math.max(0, Math.round(kg * priceCents));
  return (
    <div className="tag-notch overflow-hidden rounded-3xl bg-ink text-white shadow-[0_24px_60px_-30px_rgb(14_48_76/0.8)]">
      <div className="px-6 pt-5 pb-6">
        <div className="flex items-center justify-between text-sm text-white/65">
          <span className="font-semibold tracking-wide text-white uppercase">
            {t("Votre annonce")}
          </span>
          <span className="first-letter:uppercase">{dateLabel(t, lang, date)}</span>
        </div>
        <div className="mt-5">
          <Codes
            from={from}
            to={to}
            fromCode={code(from, fromIata)}
            toCode={code(to, toIata)}
            dark
          />
        </div>
      </div>
      <div className="perforation mx-6 opacity-30" />
      <dl className="tabular grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-5 text-sm">
        <div>
          <dt className="text-white/55">{t("Transport")}</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 font-semibold">
            <Icon className="h-4 w-4 text-signal" aria-hidden="true" />
            {mode === "plane" && flight ? flight : MODE_LABEL[mode]}
          </dd>
        </div>
        <div>
          <dt className="text-white/55">{t("Départ")}</dt>
          <dd className="mt-0.5 font-semibold">{time || "--:--"}</dd>
        </div>
        <div>
          <dt className="text-white/55">{t("Kilos libres")}</dt>
          <dd key={kg} className="pop-in mt-0.5 font-semibold">
            {t("{v} kg", { v: kg || 0 })}
          </dd>
        </div>
        <div>
          <dt className="text-white/55">{t("Prix au kilo")}</dt>
          <dd key={priceCents} className="pop-in mt-0.5 font-semibold">
            {euros(priceCents)}
          </dd>
        </div>
      </dl>
      <div className="bg-signal px-6 py-4 text-ink">
        <p className="text-sm font-semibold">{t("Si tout part, vous gagnez")}</p>
        <p key={total} className="display pop-in text-3xl">
          {euros(total)}
        </p>
      </div>
    </div>
  );
}

/** Aperçu de la demande, sous forme d'étiquette de colis, mis à jour pendant la saisie. */
export function ParcelPreview({
  from,
  to,
  fromIata,
  toIata,
  category,
  kg,
  dims,
  photos,
  homeDelivery,
  latest,
}: {
  from: string;
  to: string;
  fromIata?: string;
  toIata?: string;
  category?: string;
  kg: number;
  dims?: string;
  photos: string[];
  homeDelivery: boolean;
  latest?: string;
}) {
  const t = useT();
  const lang = useLocale();
  const fr = CATEGORIES.find((c) => c.id === category)?.label;
  const label = fr && t(fr);
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-3xl bg-[#e9d3ae] p-1.5 shadow-[0_24px_60px_-30px_rgb(14_48_76/0.7)]">
        {/* Ruban adhésif */}
        <span
          className="absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 bg-[#d9bb87]/70"
          aria-hidden="true"
        />
        <div className="relative rounded-[20px] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold tracking-wide uppercase">
              {t("Colis")}
            </span>
            <span className="text-sm text-muted">
              {latest ? t("avant le {dateLabel}", { dateLabel: dateLabel(t, lang, latest) }) : t("Dates à choisir")}
            </span>
          </div>
          <div className="mt-4">
            <Codes
              from={from}
              to={to}
              fromCode={code(from, fromIata)}
              toCode={code(to, toIata)}
            />
          </div>
          <div className="perforation my-4" />
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted">{t("Contenu")}</p>
              <p key={label} className="pop-in truncate font-semibold">
                {label ?? t("À préciser")}
              </p>
              {dims && <p className="text-sm text-muted">{dims}</p>}
            </div>
            <p key={kg} className="display pop-in shrink-0 text-4xl">
              {kg || 0}
              <span className="ml-1 text-lg">{t("kg")}</span>
            </p>
          </div>
          {/* Code-barres décoratif */}
          <div
            className="mt-4 flex h-8 items-stretch gap-[3px]"
            aria-hidden="true"
          >
            {"2131231121322131121312".split("").map((w, i) => (
              <span
                key={i}
                className="bg-ink"
                style={{ width: `${Number(w) * 1.5}px` }}
              />
            ))}
          </div>
        </div>
      </div>
      {homeDelivery && (
        <span className="stamp-in absolute -top-3 -right-2 flex items-center gap-1.5 rounded-lg border-2 border-brand bg-white px-2.5 py-1 text-xs font-extrabold text-brand uppercase">
          <Home className="h-3.5 w-3.5" aria-hidden="true" />{" "}{t("À domicile")}
        </span>
      )}
      {photos.length > 0 && (
        <div className="mt-4 flex justify-center">
          {photos.slice(0, 4).map((src, i) => (
            <span
              key={src}
              className="pop-in -ml-3 block h-20 w-20 overflow-hidden rounded-xl bg-white p-1 shadow-md ring-1 ring-line first:ml-0"
              style={{ transform: `rotate(${[-6, 4, -2, 7][i]}deg)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-full w-full rounded-lg object-cover"
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
