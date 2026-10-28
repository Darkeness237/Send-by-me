import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { dayLabel, timeLabel } from "@/lib/format";
import { TRACKING_END, TRACKING_STEPS } from "@/lib/tracking";
import { getLocale, getT } from "@/i18n/server";

type Event = { kind: string; at: string; note?: string | null };

/** Frise de suivi : étapes passées (avec date) et étapes à venir. */
export async function TrackingTimeline({
  events,
  homeDelivery,
  details = {},
}: {
  events: Event[];
  homeDelivery: boolean;
  /** Précision affichée sous une étape (par exemple le vol sous « En transit »). */
  details?: Record<string, string>;
}) {
  const t = await getT();
  const lang = await getLocale();
  const byKind = new Map(events.map((e) => [e.kind, e]));
  const ended = events.find((e) => TRACKING_END[e.kind]);
  const steps = TRACKING_STEPS.filter((s) => homeDelivery || s.kind !== "out_for_delivery");
  const lastDone = Math.max(-1, ...steps.map((s, i) => (byKind.has(s.kind) ? i : -1)));

  return (
    <ol className="space-y-0">
      {steps.map((s, i) => {
        const e = byKind.get(s.kind);
        const done = i <= lastDone;
        const current = i === lastDone && !ended;
        return (
          <li key={s.kind} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <span className={`absolute top-6 left-[11px] h-[calc(100%-1.25rem)] w-0.5 ${i < lastDone ? "bg-brand-fill" : "bg-line"}`} aria-hidden="true" />
            )}
            {done ? (
              <CheckCircle2 className={`relative h-6 w-6 shrink-0 ${current ? "text-brand" : "text-ok"}`} aria-hidden="true" />
            ) : (
              <Circle className="relative h-6 w-6 shrink-0 text-line" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className={done ? "font-semibold text-ink" : "text-muted"}>{t(s.label)}</p>
              {details[s.kind] && <p className="text-sm text-ink-soft">{details[s.kind]}</p>}
              {e && (
                <p className="tabular text-sm text-muted">
                  {dayLabel(e.at, undefined, lang)}, {timeLabel(e.at, undefined, lang)}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
      {ended && (
        <li className="flex gap-3 pt-5">
          <XCircle className="h-6 w-6 shrink-0 text-danger" aria-hidden="true" />
          <div>
            <p className="font-semibold text-danger">{t(TRACKING_END[ended.kind])}</p>
            <p className="tabular text-sm text-muted">
              {dayLabel(ended.at, undefined, lang)}, {timeLabel(ended.at, undefined, lang)}
            </p>
          </div>
        </li>
      )}
    </ol>
  );
}
