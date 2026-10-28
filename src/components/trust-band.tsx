import Link from "next/link";
import { BadgeCheck, Camera, KeyRound, Lock, MapPinned, type LucideIcon } from "lucide-react";
import { getT } from "@/i18n/server";

/** Ce qui protège l'expéditeur, dans l'ordre où ça se passe : ce qu'un visiteur veut savoir avant de créer un compte. */
const STEPS: [LucideIcon, string, string, string][] = [
  [BadgeCheck, "Avant", "Voyageurs vérifiés", "Pièce d'identité et selfie contrôlés, avis des précédents envois."],
  [Lock, "Au paiement", "Argent bloqué", "Le voyageur n'est payé qu'une fois le colis livré. Sinon, vous êtes remboursé."],
  [Camera, "À la remise", "Colis contrôlé", "Montré ouvert au voyageur, photographié avant d'être fermé."],
  [MapPinned, "Pendant le trajet", "Suivi en temps réel", "Chaque étape s'affiche, avec un lien de suivi pour votre destinataire."],
  [KeyRound, "À l'arrivée", "Code de réception", "Votre proche donne son code à 6 chiffres : sans lui, pas de livraison."],
];

export async function TrustBand({ id = "protection" }: { id?: string }) {
  const t = await getT();
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-12 sm:px-6 md:pt-16" aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold tracking-wide text-brand uppercase">{t("Votre protection")}</p>
          <h2 id={`${id}-title`} className="display mt-1 max-w-2xl text-3xl sm:text-4xl">
            {t("Protégé à chaque étape, du départ jusqu'à vos proches")}
          </h2>
        </div>
        <Link href="/securite" className="font-semibold text-brand underline-offset-4 hover:underline">
          {t("Tout savoir sur la sécurité")}
        </Link>
      </div>
      <ol className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Fil du parcours, derrière les pastilles (grand écran) */}
        <span className="pointer-events-none absolute top-7 right-[10%] left-[10%] hidden border-t-2 border-dashed border-brand/30 lg:block" aria-hidden="true" />
        {STEPS.map(([Icon, when, title, text], i) => (
          <li key={title} className="relative rounded-3xl bg-white p-5 ring-1 ring-line">
            <span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${i % 2 ? "bg-ink text-signal" : "bg-signal text-ink"}`}>
              <Icon className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="mt-4 text-xs font-extrabold tracking-wide text-muted uppercase">
              {i + 1}. {t(when)}
            </p>
            <h3 className="mt-1 text-lg leading-snug font-bold">{t(title)}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{t(text)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
