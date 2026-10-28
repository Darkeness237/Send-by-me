import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BadgeCheck, KeyRound, Lock, MessageCircle, PackagePlus, PackageX, Plane, Star } from "lucide-react";
import { DepartureBoard } from "@/components/departure-board";
import { SearchForm } from "@/components/search-form";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button";
import { getHomeProof, getMarketPrices, searchTrips } from "@/lib/data";
import { PriceCalculator } from "@/components/price-calculator";
import { demoTrips } from "@/lib/demo";
import { CORRIDORS, corridorSlug, findPlace } from "@/lib/places";
import { euros, quote } from "@/lib/pricing";
import { FAQ } from "@/components/faq";
import voyageuse from "../../public/images/voyageuse-valise.jpg";
import remise from "../../public/images/remise-colis.jpg";
import valise from "../../public/images/preparer-valise.jpg";
import famille from "../../public/images/cadeau-famille.jpg";

async function LiveBoard() {
  const trips = await searchTrips({}, 6).catch(() => []);
  return <DepartureBoard trips={trips.length >= 3 ? trips : demoTrips()} rows={4} />;
}

const example = quote(900, 5);

async function Calculator() {
  const market = await getMarketPrices().catch(() => []);
  return <PriceCalculator market={market} />;
}

/** Chiffres et avis réels. Tant qu'un chiffre est trop petit pour parler, on montre un fait vérifiable à la place. */
async function HomeProof() {
  const p = await getHomeProof().catch(() => null);
  const live = [
    p && p.upcomingTrips >= 10 && { value: p.upcomingTrips.toLocaleString("fr-FR"), label: "trajets à venir en ce moment" },
    p && p.availableKg >= 100 && { value: `${p.availableKg.toLocaleString("fr-FR")} kg`, label: "disponibles dans les valises" },
    p && p.delivered >= 25 && { value: p.delivered.toLocaleString("fr-FR"), label: "colis livrés et validés par code" },
    p && p.ratingAvg && p.ratingCount >= 10 && {
      value: `${p.ratingAvg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5`,
      label: `note moyenne sur ${p.ratingCount} avis`,
    },
  ].filter(Boolean) as { value: string; label: string }[];
  const facts = [
    { value: euros(example.totalCents), label: "pour 5 kg Paris → Douala à 9 €/kg, tout compris" },
    { value: "7 744", label: "aéroports dans 236 pays, tous disponibles à la publication" },
    { value: "100 %", label: "du prix fixé revient au voyageur" },
    { value: "0 €", label: "pour publier un trajet ou une demande" },
  ];
  const tiles = [...live, ...facts].slice(0, 4);
  const reviews = p?.reviews ?? [];

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
      <h2 className="display max-w-2xl text-3xl sm:text-4xl">Des kilos libres près de chez vous, à prix connu d&apos;avance</h2>
      <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-3xl bg-white p-6 ring-1 ring-line">
            <dt className="sr-only">{t.label}</dt>
            <dd className="wide tabular text-3xl font-extrabold text-ink sm:text-4xl">{t.value}</dd>
            <dd className="mt-2 text-[15px] leading-snug text-muted">{t.label}</dd>
          </div>
        ))}
      </dl>

      {reviews.length >= 3 && (
        <div className="mt-12">
          <h3 className="text-xl font-bold">Ce qu&apos;en disent nos membres</h3>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <li key={r.created_at + r.author} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-line">
                <p className="flex gap-0.5" aria-label={`${r.rating} sur 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-signal text-signal" : "text-line"}`} aria-hidden="true" />
                  ))}
                </p>
                <blockquote className="mt-3 flex-1 leading-relaxed text-ink-soft">« {r.comment} »</blockquote>
                <p className="mt-4 text-sm font-semibold text-ink">
                  {r.author}
                  {r.route && <span className="font-normal text-muted"> · {r.route}</span>}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Avis laissés après un envoi réel sur Send By Me, publiés sans retouche.</p>
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/recherche" size="lg">
          Trouver un voyageur <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
        <ButtonLink href="/publier" size="lg" variant="outline">
          Rentabiliser mes kilos
        </ButtonLink>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-paper text-ink">
          {/* Halos aux couleurs des deux mains du logo */}
          <span className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-signal/15 blur-3xl" aria-hidden="true" />
          <span className="pointer-events-none absolute -right-24 top-40 h-[28rem] w-[28rem] rounded-full bg-brand/15 blur-3xl" aria-hidden="true" />
          {/* Mobile : texte, recherche, tableau. Desktop : texte | tableau, puis recherche sur toute la largeur. */}
          <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-10 pb-10 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-x-14 lg:gap-y-10 lg:pb-12">
            <div className="lg:col-start-1 lg:row-start-1">
              <h1 className="display reveal text-[40px] sm:text-[56px] lg:text-[64px]">
                Vos colis <span className="text-brand">voyagent</span> dans la valise de{" "}
                <span className="relative whitespace-nowrap">
                  quelqu&apos;un.
                  <span className="absolute inset-x-0 -bottom-1 h-2 rounded-full bg-signal/60" aria-hidden="true" />
                </span>
              </h1>
              <p className="reveal reveal-delay-1 mt-5 max-w-[34rem] text-lg leading-relaxed text-ink-soft">
                Des voyageurs vérifiés proposent leurs kilos libres entre l&apos;Europe et l&apos;Afrique. Vous choisissez votre
                voyageur, et vous suivez votre colis jusqu&apos;à ce qu&apos;il arrive chez vos proches.
              </p>
              <ul className="mt-6 hidden flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-soft sm:flex">
                <li className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-brand" aria-hidden="true" /> Identités vérifiées
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-brand" aria-hidden="true" /> Paiement en ligne sécurisé
                </li>
                <li className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-brand" aria-hidden="true" /> Code de remise à 6 chiffres
                </li>
              </ul>
            </div>
            <div className="reveal reveal-delay-2 space-y-4 lg:col-span-2 lg:row-start-2">
              <SearchForm />
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/demandes/nouvelle"
                  className="group flex items-center gap-4 rounded-2xl bg-brand p-5 text-white shadow-[0_16px_40px_-24px_rgb(14_48_76/0.6)] transition hover:bg-brand-deep"
                >
                  <PackagePlus className="h-10 w-10 shrink-0 rounded-xl bg-white/15 p-2" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-lg font-extrabold">Envoyer un colis</span>
                    <span className="block text-sm text-white/80">Publiez votre demande : les voyageurs qui partent vous la proposent.</span>
                  </span>
                  <ArrowRight className="ml-auto h-5 w-5 shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
                </Link>
                <Link
                  href="/publier"
                  className="group flex items-center gap-4 rounded-2xl bg-signal p-5 text-ink shadow-[0_16px_40px_-24px_rgb(14_48_76/0.6)] transition hover:brightness-95"
                >
                  <Plane className="h-10 w-10 shrink-0 rounded-xl bg-white/30 p-2" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-lg font-extrabold">Proposer mes kilos</span>
                    <span className="block text-sm text-ink/75">Vous voyagez ? Rentabilisez la place libre dans votre valise.</span>
                  </span>
                  <ArrowRight className="ml-auto h-5 w-5 shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="reveal reveal-delay-3 relative lg:col-start-2 lg:row-start-1">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-signal sm:aspect-[5/4] lg:aspect-[4/5]">
                <Image
                  src={voyageuse}
                  alt="Une voyageuse souriante, billet en main, tire sa valise"
                  fill
                  priority
                  placeholder="blur"
                  sizes="(min-width: 1024px) 520px, 100vw"
                  className="object-cover object-[50%_25%]"
                />
              </div>
              <div className="relative -mt-14 px-3 sm:px-6 lg:absolute lg:bottom-8 lg:-left-6 lg:mt-0 lg:w-[380px] lg:px-0 xl:-left-12 xl:w-[400px]">
                <Suspense fallback={<div className="h-[200px] rounded-2xl bg-[#0b1630] ring-1 ring-white/10" />}>
                  <LiveBoard />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* Calculateur et code de réception, dès l'arrivée sur le site */}
        <section className="mx-auto grid max-w-6xl gap-6 px-4 pt-12 sm:px-6 md:pt-16 lg:grid-cols-[1.25fr_1fr] lg:items-stretch">
          <Suspense fallback={<div className="h-[320px] rounded-3xl bg-white ring-1 ring-line" />}>
            <Calculator />
          </Suspense>
          <div className="rounded-3xl bg-ink p-6 text-white sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <KeyRound className="h-5 w-5 text-signal" aria-hidden="true" /> Le code de réception
            </h2>
            <p className="mt-2 text-sm text-white/70">Le colis n&apos;est livré que lorsque votre destinataire le reçoit en main propre.</p>
            <p className="wide tabular mt-5 text-center text-4xl font-extrabold tracking-[0.3em] text-signal" aria-hidden="true">
              482 913
            </p>
            <ol className="mt-5 space-y-3 text-[15px]">
              {[
                "Vous payez : un code à 6 chiffres est créé pour votre envoi.",
                "Votre destinataire le reçoit par e-mail. Le voyageur, lui, ne le connaît pas.",
                "En recevant le colis, votre destinataire donne le code au voyageur : la livraison est validée.",
              ].map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="wide tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-extrabold text-signal">
                    {i + 1}
                  </span>
                  <span className="text-white/85">{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Deux publics */}
        <section className="mx-auto grid max-w-6xl gap-5 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
          <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
            <div className="relative aspect-[16/9]">
              <Image src={remise} alt="Un colis passe de main en main" fill placeholder="blur" sizes="(min-width: 768px) 560px, 100vw" className="object-cover" />
            </div>
            <div className="p-7 sm:p-9">
            <h2 className="wide text-2xl font-extrabold">Vous envoyez un colis</h2>
            <p className="mt-3 text-muted">
              Des vêtements pour la famille, des documents, un téléphone pour un proche. Choisissez un voyageur selon sa
              date, son prix au kilo et ses avis.
            </p>
            <ul className="mt-6 space-y-3 text-[15px]">
              <li>Souvent moins cher qu&apos;un transporteur, et livré en main propre.</li>
              <li>Vous échangez avec le voyageur avant de lui confier quoi que ce soit.</li>
              <li>Vous suivez votre colis à chaque étape, jusqu&apos;à la remise.</li>
            </ul>
            <ButtonLink href="/recherche" className="mt-8">
              Trouver un voyageur
            </ButtonLink>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl bg-signal">
            <div className="relative aspect-[16/9]">
              <Image src={valise} alt="Un père et ses enfants préparent une valise jaune" fill placeholder="blur" sizes="(min-width: 768px) 560px, 100vw" className="object-cover object-[50%_40%]" />
            </div>
            <div className="p-7 sm:p-9">
            <h2 className="wide text-2xl font-extrabold">Vous avez des kilos libres</h2>
            <p className="mt-3 text-ink-soft">
              Vous partez à Douala, Dakar ou Abidjan avec de la place dans votre valise ? Proposez-la et fixez votre prix.
            </p>
            <ul className="mt-6 space-y-3 text-[15px]">
              <li>Vous acceptez seulement les colis qui vous conviennent.</li>
              <li>Vous voyez le contenu avant de fermer le colis.</li>
              <li>Publier votre trajet est gratuit.</li>
            </ul>
            <ButtonLink href="/publier" variant="primary" className="mt-8 bg-ink hover:bg-ink-soft">
              Proposer mes kilos
            </ButtonLink>
            </div>
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
                ["Payez en ligne", "Par carte, en toute sécurité. Aucun paiement en espèces."],
                ["Remise avec un code", "Votre destinataire donne son code de 6 chiffres au voyageur : la réception est validée."],
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

        {/* Chiffres et avis */}
        <Suspense fallback={<div className="mx-auto h-[420px] max-w-6xl" />}>
          <HomeProof />
        </Suspense>

        {/* Exemple de prix */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <h2 className="display text-3xl sm:text-4xl">Le prix est affiché avant de réserver</h2>
            <p className="mt-4 max-w-md text-muted">
              Le voyageur fixe son prix au kilo. On ajoute nos frais de service : de 15 % pour un petit colis à 8 % au-delà de 20 kg, plus 2 € par envoi pour la sécurité et le suivi.
              Pas de mauvaise surprise au moment de payer.
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
            <p className="mt-4 text-sm text-muted">Le voyageur reçoit {euros(example.baseCents)}.</p>
          </div>
        </section>

        {/* L'arrivée */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-20">
          <div className="grid overflow-hidden rounded-3xl bg-ink text-white md:grid-cols-2">
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[380px]">
              <Image src={famille} alt="Une mère tend un cadeau à sa fille souriante" fill placeholder="blur" sizes="(min-width: 768px) 560px, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-12">
              <h2 className="display text-3xl sm:text-4xl">À l&apos;arrivée, c&apos;est votre famille qui valide</h2>
              <p className="mt-4 max-w-md leading-relaxed text-white/75">
                Le voyageur remet le colis en main propre à la personne que vous avez choisie. Elle lui donne son code de
                remise, et la livraison est validée.
              </p>
              <ButtonLink href="/comment-ca-marche" variant="signal" className="mt-8 self-start">
                Voir le parcours complet
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* Confiance */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <h2 className="display max-w-2xl text-3xl sm:text-4xl">Confier un colis à un inconnu, oui, mais pas à n&apos;importe qui</h2>
            <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [BadgeCheck, "Identité vérifiée", "Pièce d'identité et selfie contrôlés avant d'obtenir le badge bleu."],
                [Lock, "Paiement sécurisé", "Vous payez en ligne, jamais en espèces. En cas de problème, vous êtes remboursé."],
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
      <MobileTabBar />
    </>
  );
}
