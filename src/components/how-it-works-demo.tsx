import { Check, Plane, Truck } from "lucide-react";
import { getT } from "@/i18n/server";

/**
 * Démonstration animée du parcours en trois étapes (accueil). Animation en CSS uniquement
 * (globals.css, « demo- ») : elle tourne en boucle et s'arrête si le membre a réduit les animations.
 */
export async function HowItWorksDemo() {
  const t = await getT();
  return (
    <section className="border-y border-line bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <h2 className="display max-w-xl text-3xl sm:text-4xl">{t("Comment ça marche, en 3 étapes")}</h2>

        {/* Piste : l'avion relie les trois étapes */}
        <div className="demo-track relative mt-10 hidden h-1.5 rounded-full bg-line md:block" aria-hidden="true">
          <span className="demo-track-fill absolute inset-y-0 left-0 rounded-full bg-brand" />
          <Plane className="demo-plane absolute -top-[9px] h-6 w-6 rotate-45 text-signal" />
        </div>

        <ol className="mt-6 grid gap-5 md:mt-8 md:grid-cols-3">
          <li className="demo-step rounded-3xl border-2 border-transparent bg-paper p-6 ring-1 ring-line">
            <StepNumber n={1} />
            <h3 className="mt-4 text-lg font-bold">{t("Le voyageur publie ses kilos libres")}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{t("Il indique son trajet, sa date et son prix au kilo. C'est gratuit.")}</p>
            {/* Valise qui se remplit : la partie orange, ce sont les kilos libres */}
            <div className="mt-5 flex items-end gap-4" aria-hidden="true">
              <div className="relative h-28 w-20 overflow-hidden rounded-2xl border-4 border-ink/80">
                <span className="absolute inset-x-0 bottom-0 h-[60%] bg-brand" />
                <span className="demo-kilos absolute inset-x-0 bottom-[60%] h-[40%] bg-[repeating-linear-gradient(45deg,var(--color-signal),var(--color-signal)_8px,#f6b968_8px,#f6b968_16px)]" />
              </div>
              <span className="pb-2 text-sm font-bold text-signal-deep">{t("Kilos libres")}</span>
            </div>
          </li>

          <li className="demo-step rounded-3xl border-2 border-transparent bg-paper p-6 ring-1 ring-line">
            <StepNumber n={2} />
            <h3 className="mt-4 text-lg font-bold">{t("L'expéditeur réserve et paie en ligne")}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{t("Le voyageur accepte le colis. L'argent reste bloqué jusqu'à la remise.")}</p>
            {/* Carte de réservation : le bouton devient « Réservé » */}
            <div className="mt-5 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-line" aria-hidden="true">
              <p className="font-bold">Paris → Douala</p>
              <span className="mt-2 block h-2.5 w-3/4 rounded-full bg-line" />
              <span className="relative mt-4 block h-10 overflow-hidden rounded-full text-sm font-bold text-white">
                <span className="demo-pay absolute inset-0 flex items-center justify-center bg-ink">{t("Payer")}</span>
                <span className="demo-paid absolute inset-0 flex items-center justify-center gap-1.5 bg-brand">
                  <Check className="h-4 w-4" /> {t("Réservé")}
                </span>
              </span>
            </div>
          </li>

          <li className="demo-step rounded-3xl border-2 border-transparent bg-paper p-6 ring-1 ring-line">
            <StepNumber n={3} />
            <h3 className="mt-4 text-lg font-bold">{t("Remise contre un code à 6 chiffres")}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{t("Le destinataire donne son code au voyageur : la remise est validée, le voyageur est payé.")}</p>
            {/* Code qui se remplit puis passe au vert */}
            <div className="demo-code mt-5 flex gap-1.5" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="demo-digit flex h-12 w-10 items-center justify-center rounded-xl border-2 border-line bg-card text-xl font-extrabold" style={{ "--i": i } as React.CSSProperties}>
                  •
                </span>
              ))}
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-signal/15 px-3 py-1 text-sm font-bold text-signal-deep">
              <Truck className="h-4 w-4" aria-hidden="true" /> {t("Ou livraison à domicile au Cameroun")}
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}

function StepNumber({ n }: { n: number }) {
  return <span className="wide tabular flex h-10 w-10 items-center justify-center rounded-full bg-night text-sm font-extrabold text-signal">{n}</span>;
}
