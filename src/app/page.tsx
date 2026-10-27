import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, KeyRound, Lock, MessageCircle, PackageX, Star } from "lucide-react";
import { DepartureBoard } from "@/components/departure-board";
import { SearchForm } from "@/components/search-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button";
import { searchTrips } from "@/lib/data";
import { demoTrips } from "@/lib/demo";
import { CORRIDORS, corridorSlug, findPlace } from "@/lib/places";
import { euros, quote } from "@/lib/pricing";
import { FAQ } from "@/components/faq";

async function LiveBoard() {
  const trips = await searchTrips({}, 6).catch(() => []);
  return <DepartureBoard trips={trips.length >= 3 ? trips : demoTrips()} />;
}

const example = quote(900, 5);

export default function Home() {
  return (
    <>
      <SiteHeader tone="dark" />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-ink text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-16 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:pb-24">
            <div>
              <h1 className="display text-[40px] sm:text-[56px] lg:text-[64px]">
                Vos colis voyagent dans la valise de quelqu&apos;un.
              </h1>
              <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-white/75">
                Des voyageurs vérifiés proposent leurs kilos libres entre l&apos;Europe et l&apos;Afrique. Vous payez en
                ligne, et l&apos;argent reste bloqué jusqu&apos;à ce que votre destinataire ait le colis en main.
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
                <li className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-signal" aria-hidden="true" /> Identités vérifiées
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-signal" aria-hidden="true" /> Paiement bloqué jusqu&apos;à la livraison
                </li>
                <li className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-signal" aria-hidden="true" /> Code de remise à 6 chiffres
                </li>
              </ul>
            </div>
            <Suspense fallback={<div className="h-[300px] rounded-2xl bg-[#0b1630] ring-1 ring-white/10" />}>
              <LiveBoard />
            </Suspense>
          </div>
          <div className="relative mx-auto -mb-px max-w-6xl px-4 pb-8 sm:px-6 lg:-mt-6">
            <SearchForm />
          </div>
        </section>

        {/* Deux publics */}
        <section className="mx-auto grid max-w-6xl gap-5 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
          <div className="rounded-3xl bg-white p-7 ring-1 ring-line sm:p-9">
            <h2 className="wide text-2xl font-extrabold">Vous envoyez un colis</h2>
            <p className="mt-3 text-muted">
              Des vêtements pour la famille, des documents, un téléphone pour un proche. Choisissez un voyageur selon sa
              date, son prix au kilo et ses avis.
            </p>
            <ul className="mt-6 space-y-3 text-[15px]">
              <li>Souvent moins cher qu&apos;un transporteur, et livré en main propre.</li>
              <li>Vous échangez avec le voyageur avant de lui confier quoi que ce soit.</li>
              <li>Il n&apos;est payé que quand votre destinataire donne le code.</li>
            </ul>
            <ButtonLink href="/recherche" className="mt-8">
              Trouver un voyageur
            </ButtonLink>
          </div>
          <div className="rounded-3xl bg-signal p-7 sm:p-9">
            <h2 className="wide text-2xl font-extrabold">Vous avez des kilos libres</h2>
            <p className="mt-3 text-ink-soft">
              Vous partez à Douala, Dakar ou Abidjan avec de la place dans votre valise ? Proposez-la et fixez votre prix.
            </p>
            <ul className="mt-6 space-y-3 text-[15px]">
              <li>Vous acceptez seulement les colis qui vous conviennent.</li>
              <li>Vous voyez le contenu avant de fermer le colis.</li>
              <li>Le paiement vous est versé dès la remise confirmée.</li>
            </ul>
            <ButtonLink href="/publier" variant="primary" className="mt-8 bg-ink hover:bg-ink-soft">
              Proposer mes kilos
            </ButtonLink>
          </div>
        </section>

        {/* Étapes */}
        <section className="border-y border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <h2 className="display max-w-xl text-3xl sm:text-4xl">Un envoi en quatre étapes</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Trouvez un trajet", "Cherchez votre ville de départ et d'arrivée. Comparez dates, prix au kilo et avis."],
                ["Demandez des kilos", "Décrivez votre colis. Le voyageur accepte ou refuse, vous pouvez discuter avec lui."],
                ["Payez en ligne", "Le montant est bloqué par Send By Me. Le voyageur ne le reçoit pas encore."],
                ["Remise avec un code", "Votre destinataire donne son code de 6 chiffres au voyageur. Le paiement est alors libéré."],
              ].map(([title, text], i) => (
                <li key={title} className="relative">
                  <span className="wide tabular flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-signal">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Exemple de prix */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <h2 className="display text-3xl sm:text-4xl">Le prix est affiché avant de réserver</h2>
            <p className="mt-4 max-w-md text-muted">
              Chaque voyageur fixe son prix au kilo. Send By Me ajoute des frais de service de 12 %, qui financent la
              vérification des membres, le paiement sécurisé et le support. Aucun autre frais.
            </p>
          </div>
          <div className="tag-notch rounded-[var(--radius-tag)] bg-white p-6 shadow-[var(--shadow-tag)] ring-1 ring-line sm:p-8">
            <p className="text-sm text-muted">Exemple : 5 kg de Paris à Douala, à 9 € le kilo</p>
            <dl className="tabular mt-5 space-y-3 text-[15px]">
              <div className="flex justify-between">
                <dt>5 kg × 9 €</dt>
                <dd className="font-semibold">{euros(example.baseCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Frais de service</dt>
                <dd className="font-semibold">{euros(example.feeCents)}</dd>
              </div>
              <div className="perforation my-4" />
              <div className="flex items-baseline justify-between">
                <dt className="font-semibold">Total payé</dt>
                <dd className="wide text-3xl font-extrabold">{euros(example.totalCents)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-muted">Le voyageur reçoit {euros(example.baseCents)} après la livraison.</p>
          </div>
        </section>

        {/* Confiance */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <h2 className="display max-w-2xl text-3xl sm:text-4xl">Confier un colis à un inconnu, oui, mais pas à n&apos;importe qui</h2>
            <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [BadgeCheck, "Identité vérifiée", "Le badge bleu indique qu'une pièce d'identité a été contrôlée par notre équipe."],
                [Lock, "Argent bloqué", "Le voyageur est payé seulement après la remise. En cas de problème, vous êtes remboursé."],
                [KeyRound, "Code de remise", "Seul votre destinataire connaît le code. Sans lui, la livraison ne peut pas être validée."],
                [Star, "Avis après chaque envoi", "Expéditeurs et voyageurs se notent mutuellement. Les avis ne peuvent pas être supprimés."],
                [MessageCircle, "Messagerie intégrée", "Échangez photos du colis et lieu de rendez-vous sans donner votre numéro."],
                [PackageX, "Objets interdits", "Le voyageur ouvre le colis devant vous. Liquides, argent liquide et produits illicites sont refusés."],
              ].map(([Icon, title, text]) => {
                const I = Icon as typeof Lock;
                return (
                  <div key={title as string}>
                    <I className="h-6 w-6 text-signal" aria-hidden="true" />
                    <h3 className="mt-3 text-lg font-bold">{title as string}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-white/70">{text as string}</p>
                  </div>
                );
              })}
            </div>
            <Link href="/securite" className="mt-10 inline-block font-semibold text-signal underline-offset-4 hover:underline">
              Tout savoir sur la sécurité
            </Link>
          </div>
        </section>

        {/* Corridors */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <h2 className="display text-3xl sm:text-4xl">Trajets fréquents</h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CORRIDORS.map(([a, b]) => {
              const from = findPlace(a)!;
              const to = findPlace(b)!;
              return (
                <li key={a + b}>
                  <Link
                    href={`/envoyer-un-colis/${corridorSlug(a, b)}`}
                    className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 ring-1 ring-line hover:ring-brand/50"
                  >
                    <span>
                      <span className="block font-semibold">
                        {from.city} → {to.city}
                      </span>
                      <span className="text-sm text-muted">{to.country}</span>
                    </span>
                    <span className="wide tabular text-sm font-bold text-muted">
                      {from.code}–{to.code}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* FAQ */}
        <section className="border-t border-line bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.6fr] md:py-20">
            <h2 className="display text-3xl sm:text-4xl">Questions fréquentes</h2>
            <FAQ />
          </div>
        </section>

        {/* Appel final */}
        <section className="bg-signal">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="display text-3xl">Vous partez bientôt ?</h2>
              <p className="mt-2 text-ink-soft">Publiez votre trajet en deux minutes. C&apos;est gratuit pour les voyageurs.</p>
            </div>
            <ButtonLink href="/publier" size="lg" className="bg-ink hover:bg-ink-soft">
              Proposer mes kilos
            </ButtonLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
