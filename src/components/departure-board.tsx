import { codeFor, tzFor } from "@/lib/places";
import { euros } from "@/lib/pricing";
import { timeLabel } from "@/lib/format";
import type { Trip } from "@/lib/types";

function Flaps({ text, width, delay = 0 }: { text: string; width: number; delay?: number }) {
  const chars = text.toUpperCase().padEnd(width, " ").slice(0, width).split("");
  return (
    <span className="inline-flex" aria-hidden="true">
      {chars.map((c, i) => (
        <span
          key={i}
          className={`flap flap-anim ${c === " " ? "blank" : ""}`}
          style={{ animationDelay: `${delay + i * 35}ms` }}
        >
          {c === " " ? "·" : c}
        </span>
      ))}
    </span>
  );
}

/** Tableau des départs façon aéroport : le moment fort de la page d'accueil. */
export function DepartureBoard({ trips }: { trips: Trip[] }) {
  const rows = trips.slice(0, 6);
  return (
    <div className="overflow-hidden rounded-2xl bg-[#0b1630] p-4 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6)] ring-1 ring-white/10 sm:p-5">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-white/50">
        <span className="wide text-white/80">Prochains départs</span>
        <span>Kilos libres · prix au kg</span>
      </div>
      <table className="w-full border-separate border-spacing-y-1.5 text-[13px] sm:text-[15px]">
        <caption className="sr-only">Prochains trajets avec des kilos disponibles</caption>
        <thead className="sr-only">
          <tr>
            <th>Heure</th>
            <th>Trajet</th>
            <th>Kilos libres</th>
            <th>Prix au kilo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, r) => {
            const left = Math.max(0, Math.floor(t.capacity_kg - t.reserved_kg));
            return (
              <tr key={t.id}>
                <td className="pr-2 sm:pr-3">
                  <span className="sr-only">{timeLabel(t.departure_at, tzFor(t.from_city))}</span>
                  <Flaps text={timeLabel(t.departure_at, tzFor(t.from_city)).replace(":", "")} width={4} delay={r * 120} />
                </td>
                <td className="pr-2 sm:pr-3">
                  <span className="sr-only">
                    {t.from_city} vers {t.to_city}
                  </span>
                  <Flaps text={codeFor(t.from_city)} width={3} delay={r * 120 + 80} />
                  <span className="mx-1 text-white/30" aria-hidden="true">›</span>
                  <Flaps text={codeFor(t.to_city)} width={3} delay={r * 120 + 160} />
                </td>
                <td className="hidden pr-3 min-[420px]:table-cell">
                  <span className="sr-only">{left} kilos</span>
                  <Flaps text={`${left}KG`} width={4} delay={r * 120 + 240} />
                </td>
                <td className="text-right">
                  <span className="tabular font-semibold text-signal">{euros(t.price_per_kg_cents)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
