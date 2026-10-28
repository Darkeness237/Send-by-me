import { ArrowRight, CheckCircle2, Clock, Sparkles } from "lucide-react";
import type { NextStep } from "@/lib/next-step";
import { getT } from "@/i18n/server";

/** Bandeau en haut de la réservation : la seule chose à faire maintenant. */
export async function NextStepBanner({ step }: { step: NextStep }) {
  const t = await getT();
  const tone = {
    action: {
      box: "bg-ink text-white",
      sub: "text-white/75",
      Icon: Sparkles,
      icon: "text-signal",
      label: t("Prochaine étape"),
    },
    wait: {
      box: "bg-brand-pale text-ink",
      sub: "text-ink-soft",
      Icon: Clock,
      icon: "text-brand",
      label: t("En attente"),
    },
    done: {
      box: "bg-ok-pale text-ink",
      sub: "text-ink-soft",
      Icon: CheckCircle2,
      icon: "text-ok",
      label: t("Terminé"),
    },
  }[step.tone];
  return (
    <section
      aria-label={tone.label}
      className={`flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:p-6 ${tone.box}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <tone.Icon
          className={`mt-1 h-6 w-6 shrink-0 ${tone.icon}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-semibold tracking-wide uppercase ${tone.sub}`}
          >
            {tone.label}
          </p>
          <p className="mt-0.5 text-lg leading-snug font-bold">{step.title}</p>
          {step.text && (
            <p className={`mt-1 text-sm ${tone.sub}`}>{step.text}</p>
          )}
        </div>
      </div>
      {step.cta && (
        <a
          href={step.cta.href}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${step.tone === "action" ? "bg-signal text-ink hover:brightness-95" : "bg-white text-ink ring-1 ring-line hover:ring-brand"}`}
        >
          {step.cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </section>
  );
}
