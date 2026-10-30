import Link from "next/link";
import { BadgeCheck, CreditCard, KeyRound, Lock, MessageCircle, PackageX, Star, Wallet } from "lucide-react";
import { getT } from "@/i18n/server";

/**
 * Bloc confiance de l'accueil : explique d'abord les deux mécanismes qui protègent l'envoi
 * (paiement bloqué, code de remise), puis les autres garanties.
 */
export async function TrustExplainer() {
  const t = await getT();
  const flow: [typeof Lock, string, string][] = [
    [CreditCard, "Vous payez en ligne", "Par carte, jamais en espèces."],
    [Lock, "L'argent est bloqué", "Send By Me le garde jusqu'à la remise."],
    [KeyRound, "Le destinataire donne son code", "6 chiffres, que lui seul connaît."],
    [Wallet, "Le voyageur est payé", "Seulement après la remise validée."],
  ];
  const others: [typeof Lock, string, string][] = [
    [BadgeCheck, "Identité vérifiée", "Pièce d'identité et selfie contrôlés avant d'obtenir le badge bleu."],
    [Star, "Avis après chaque envoi", "Expéditeurs et voyageurs se notent mutuellement. Les avis ne peuvent pas être supprimés."],
    [MessageCircle, "Messagerie intégrée", "Échangez photos du colis et lieu de rendez-vous sans donner votre numéro."],
    [PackageX, "Objets interdits", "Le voyageur ouvre le colis devant vous. Liquides, argent liquide et produits illicites sont refusés."],
  ];
  return (
    <section className="bg-night text-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <h2 className="display max-w-2xl text-3xl sm:text-4xl">{t("Confier un colis à un inconnu, oui, mais pas à n'importe qui")}</h2>
        <p className="mt-4 max-w-2xl text-white/75">{t("Deux protections font la différence : le paiement reste bloqué, et seul votre destinataire peut valider la remise.")}</p>

        {/* Parcours de l'argent, étape par étape */}
        <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {flow.map(([Icon, title, text], i) => (
            <li key={title} className="trust-flow relative rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10" style={{ "--i": i } as React.CSSProperties}>
              <span className="trust-flow-icon flex h-11 w-11 items-center justify-center rounded-full bg-signal text-navy">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-bold">{t(title)}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-white/70">{t(text)}</p>
              {i < flow.length - 1 && <span className="absolute top-1/2 -right-3 hidden h-0.5 w-3 bg-signal/60 lg:block" aria-hidden="true" />}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-white/60">{t("Colis non livré : vous êtes remboursé après examen du dossier. Après 5 codes incorrects, la validation est bloquée et notre équipe intervient.")}</p>

        <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {others.map(([Icon, title, text]) => (
            <div key={title}>
              <Icon className="h-6 w-6 text-signal" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold">{t(title)}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-white/70">{t(text)}</p>
            </div>
          ))}
        </div>
        <Link href="/securite" className="mt-10 inline-block font-semibold text-signal underline-offset-4 hover:underline">
          {t("Tout savoir sur la sécurité")}
        </Link>
      </div>
    </section>
  );
}
