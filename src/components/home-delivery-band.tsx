import Image from "next/image";
import { House, Lock, Plane, Truck, type LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import livraison from "../../public/images/livraison-domicile.jpg";

const FLOW: [LucideIcon, string, string][] = [
  [Plane, "Le voyageur atterrit", "avec votre colis, fermé et suivi depuis le départ."],
  [Truck, "Notre livreur le récupère", "auprès du voyageur, dès son arrivée."],
  [House, "Livré à la porte de vos proches", "qui valident la réception avec leur code."],
];

/** Option livraison à domicile : les proches n'ont pas à se déplacer jusqu'au voyageur. */
export async function HomeDeliveryBand() {
  const t = await getT();
  return (
    <section id="livraison" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-12 sm:px-6 md:pt-16" aria-labelledby="livraison-title">
      <div className="grid overflow-hidden rounded-[28px] bg-ink text-white md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-[260px]">
          <Image quality={90} src={livraison} alt={t("Un livreur remet un colis en main propre")} fill placeholder="blur" sizes="(min-width: 768px) 480px, 100vw" className="object-cover" />
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-signal px-3.5 py-1.5 text-sm font-extrabold text-ink shadow-lg">
            <Truck className="h-4 w-4" aria-hidden="true" /> {t("Nouveau")}
          </span>
        </div>
        <div className="p-6 sm:p-10">
          <p className="text-sm font-extrabold tracking-wide text-signal uppercase">{t("Option livraison à domicile")}</p>
          <h2 id="livraison-title" className="display mt-2 text-3xl sm:text-4xl">
            {t("Vos proches n'ont même pas à se déplacer")}
          </h2>
          <p className="mt-3 max-w-xl text-white/80">
            {t("Le destinataire ne peut pas rejoindre le voyageur ? Cochez la livraison à domicile en réservant : nous nous occupons du dernier kilomètre.")}
          </p>
          <ol className="mt-7 space-y-4">
            {FLOW.map(([Icon, title, text], i) => (
              <li key={title} className="flex items-start gap-4">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-signal">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                  <span className="wide tabular absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-signal text-[11px] font-extrabold text-ink">
                    {i + 1}
                  </span>
                </span>
                <span>
                  <b className="block text-lg leading-snug">{t(title)}</b>
                  <span className="text-[15px] text-white/70">{t(text)}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink href="/recherche" variant="signal" size="lg">
              {t("Trouver un trajet")}
            </ButtonLink>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-white/65">
            <Lock className="h-4 w-4 shrink-0" aria-hidden="true" /> {t("L'adresse n'est transmise qu'à notre livreur partenaire, jamais au voyageur.")}
          </p>
        </div>
      </div>
    </section>
  );
}
