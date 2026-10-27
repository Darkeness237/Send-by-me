import Link from "next/link";
import { Plane, Star } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { codeFor, tzFor } from "@/lib/places";
import { euros } from "@/lib/pricing";
import { dayLabel, kg, timeLabel } from "@/lib/format";
import type { Trip } from "@/lib/types";

/** Carte trajet en forme d'étiquette bagage. */
export function TripTag({ trip, goodPrice }: { trip: Trip; goodPrice?: boolean }) {
  const left = Math.max(0, trip.capacity_kg - trip.reserved_kg);
  const pct = Math.min(100, (trip.reserved_kg / trip.capacity_kg) * 100);
  const traveler = trip.traveler;

  return (
    <Link
      href={`/trajets/${trip.id}`}
      className="group tag-notch block rounded-[var(--radius-tag)] bg-card shadow-[var(--shadow-tag)] ring-1 ring-line transition hover:ring-brand/50"
    >
      <div className="grid grid-cols-[1fr_auto] gap-x-4 px-5 pt-4 pb-4 sm:grid-cols-[88px_1fr_auto] sm:px-6">
        <div className="col-span-2 mb-3 flex items-baseline gap-2 text-sm text-muted sm:col-span-1 sm:mb-0 sm:block sm:border-r sm:border-dashed sm:border-line sm:pr-4">
          <p className="font-semibold text-ink">{dayLabel(trip.departure_at, tzFor(trip.from_city))}</p>
          <p className="tabular sm:mt-1">{timeLabel(trip.departure_at, tzFor(trip.from_city))}</p>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="wide tabular text-[28px] leading-none font-extrabold text-ink">{codeFor(trip.from_city)}</span>
            <span className="relative flex flex-1 items-center" aria-hidden="true">
              <span className="perforation w-full" />
              <Plane className="absolute left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-card text-brand" />
            </span>
            <span className="wide tabular text-[28px] leading-none font-extrabold text-ink">{codeFor(trip.to_city)}</span>
          </div>
          <div className="mt-1.5 flex justify-between gap-3 text-sm text-muted">
            <span className="truncate">{trip.from_city}</span>
            <span className="truncate text-right">{trip.to_city}</span>
          </div>
        </div>

        <div className="row-span-2 flex flex-col items-end justify-between pl-2 text-right sm:row-span-1">
          <p>
            <span className="wide tabular text-2xl font-extrabold text-ink">{euros(trip.price_per_kg_cents)}</span>
            <span className="text-sm text-muted"> /kg</span>
          </p>
          {goodPrice && <span className="mt-1 rounded-full bg-ok-pale px-2 py-0.5 text-xs font-semibold text-ok">Bon prix</span>}
        </div>
      </div>

      <div className="perforation mx-5 sm:mx-6" />

      <div className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
        {traveler && <Avatar name={traveler.full_name || "Voyageur"} verified={traveler.id_verified} certified={traveler.certified} size={34} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {traveler?.full_name || "Voyageur"}
            {trip.ticket_verified && <span className="ml-2 rounded-full bg-ok-pale px-2 py-0.5 text-xs font-semibold text-ok">Trajet vérifié</span>}
          </p>
          {traveler?.rating_count ? (
            <p className="flex items-center gap-1 text-xs text-muted">
              <Star className="h-3.5 w-3.5 fill-signal text-signal" aria-hidden="true" />
              <span className="tabular">{traveler.rating_avg?.toLocaleString("fr-FR")}</span>
              <span>({traveler.rating_count} avis)</span>
            </p>
          ) : (
            <p className="text-xs text-muted">Nouveau membre</p>
          )}
        </div>
        <div className="w-28 shrink-0 text-right">
          <p className="tabular text-sm font-semibold text-ink">{kg(left)} libres</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper" aria-hidden="true">
            <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
