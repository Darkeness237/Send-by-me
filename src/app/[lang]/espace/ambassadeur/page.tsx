import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import { Award, BadgeCheck, Check, Gift, PackageCheck, Sparkles, Star, Wallet } from "lucide-react";
import { AmbassadorBadge } from "@/components/ambassador-badge";
import { Logo } from "@/components/logo";
import { PageShell } from "@/components/page-shell";
import { PrintButton } from "@/components/print-button";
import { ShareReferral } from "@/components/share-referral";
import {
  AMBASSADOR_MIN_DELIVERIES,
  AMBASSADOR_MIN_RATING,
  AMBASSADOR_REFERRAL_CENTS,
  BOOST_FEE_CENTS,
  FIRST_MILESTONE_CENTS,
  MILESTONE_EVERY,
  NEXT_MILESTONE_CENTS,
  nextMilestone,
} from "@/lib/ambassador";
import { getAmbassadorData } from "@/lib/data";
import { dayLabel } from "@/lib/format";
import { euros } from "@/lib/pricing";
import { REFERRAL_REWARD_CENTS, referralLink } from "@/lib/referral";
import { getUserId } from "@/lib/supabase/server";
import { getLocale, getT } from "@/i18n/server";
import { intlLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Programme Ambassadeur"), robots: { index: false } };
}

async function Ambassador() {
  const t = await getT();
  const lang = await getLocale();
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/ambassadeur");
  const a = await getAmbassadorData(userId);
  const link = referralLink(a.code);
  const qr = await QRCode.toString(link, { type: "svg", margin: 1, color: { dark: "#0e304c", light: "#ffffff" } });
  const firstName = a.name.split(" ")[0] || t("Voyageur");
  const ratingOk = a.rating === null || a.rating >= AMBASSADOR_MIN_RATING;
  const steps = [
    { done: a.idVerified, label: t("Identité vérifiée"), hint: a.idVerified ? t("C'est fait.") : t("À faire depuis votre profil."), href: a.idVerified ? null : "/espace/profil" },
    {
      done: a.deliveries >= AMBASSADOR_MIN_DELIVERIES,
      label: t("{AMBASSADOR_MIN_DELIVERIES} livraisons réussies comme voyageur", { AMBASSADOR_MIN_DELIVERIES }),
      hint: t("{n} sur {total}", { n: Math.min(a.deliveries, AMBASSADOR_MIN_DELIVERIES), total: AMBASSADOR_MIN_DELIVERIES }),
      href: a.deliveries >= AMBASSADOR_MIN_DELIVERIES ? null : "/publier",
    },
    {
      done: ratingOk,
      label: t("Note d'au moins {n} sur 5", { n: AMBASSADOR_MIN_RATING.toLocaleString(intlLocale(lang)) }),
      hint: a.rating === null ? t("Pas encore d'avis : la condition est remplie.") : t("Votre note : {rating} sur {ratingCount} avis", { rating: a.rating.toLocaleString(intlLocale(lang), { maximumFractionDigits: 1 }), ratingCount: a.ratingCount }),
      href: null,
    },
  ];
  const next = nextMilestone(a.deliveries);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/espace" className="text-sm font-semibold text-brand">
        {t("← Mon espace")}
      </Link>
      <h1 className="display mt-4 flex flex-wrap items-center gap-3 text-3xl sm:text-4xl">
        {t("Programme Ambassadeur")}{" "}{a.since && <AmbassadorBadge size="md" />}
      </h1>
      <p className="mt-2 max-w-xl text-muted">
        {t("Pour les voyageurs qui font vivre Send By Me : des primes en argent, vos annonces en tête des résultats et un badge qui rassure les expéditeurs.")}
      </p>

      {a.since ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: PackageCheck, label: t("Livraisons réussies"), value: String(a.deliveries) },
            { icon: Wallet, label: t("Primes à recevoir"), value: euros(a.pendingCents) },
            { icon: Gift, label: t("Primes déjà versées"), value: euros(a.paidCents) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-white p-5 ring-1 ring-line">
              <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
              <p className="wide tabular mt-3 text-2xl font-extrabold">{value}</p>
              <p className="text-sm text-muted">{label}</p>
            </div>
          ))}
        </div>
      ) : (
        <section className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
          <h2 className="font-bold">{t("Devenez Ambassadeur")}</h2>
          <p className="mt-1 text-sm text-muted">{t("Le statut s'active tout seul dès que les trois conditions sont remplies.")}</p>
          <ul className="mt-5 space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-ok text-white" : "bg-paper ring-1 ring-line"}`}>
                  {s.done && <Check className="h-4 w-4" aria-hidden="true" />}
                </span>
                <div>
                  <p className="font-semibold">{s.label}</p>
                  <p className="text-sm text-muted">
                    {s.hint}
                    {s.href && (
                      <>
                        {" "}
                        <Link href={s.href} className="font-semibold text-brand">
                          {s.href === "/publier" ? t("Publier un trajet") : t("Vérifier mon identité")}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-bold">{t("Vos avantages")}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: Wallet,
              title: t("{euros} à la {AMBASSADOR_MIN_DELIVERIES}e livraison", { euros: euros(FIRST_MILESTONE_CENTS), AMBASSADOR_MIN_DELIVERIES }),
              text: t("Puis {euros} toutes les {MILESTONE_EVERY} livraisons, versés avec vos gains.", { euros: euros(NEXT_MILESTONE_CENTS), MILESTONE_EVERY }),
            },
            {
              icon: Gift,
              title: t("{euros} en argent par filleul", { euros: euros(AMBASSADOR_REFERRAL_CENTS) }),
              text: t("Au lieu de {euros} de crédit : dès qu'une personne inscrite avec votre lien réussit sa première livraison.", { euros: euros(REFERRAL_REWARD_CENTS) }),
            },
            {
              icon: Sparkles,
              title: t("Annonces mises en avant"),
              text: t("Vos trajets passent en tête des résultats de leur ligne, sans payer les {euros} de mise en avant.", { euros: euros(BOOST_FEE_CENTS) }),
            },
            { icon: BadgeCheck, title: "Badge Ambassadeur", text: t("Sur votre profil et vos annonces : les expéditeurs savent qu'ils peuvent compter sur vous.") },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl bg-paper p-4">
              <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
              <p className="mt-2 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ul>
        {a.since && (
          <p className="mt-3 text-sm text-muted">
            {next - a.deliveries > 1 ? t("Prochaine prime à la {next}e livraison ({n} restantes).", { next, n: next - a.deliveries }) : t("Prochaine prime à la {next}e livraison (1 restante).", { next })}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          {t("Le statut est retiré si votre note passe sous {n}. Les primes déjà gagnées restent dues.", { n: AMBASSADOR_MIN_RATING.toLocaleString(intlLocale(lang)) })}
        </p>
      </section>

      <section className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
        <h2 className="font-bold">{t("Votre lien et votre carte à accrocher à la valise")}</h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          {t("Même lien que le parrainage. Imprimez la carte et glissez-la dans le porte-étiquette de votre bagage : en salle d'embarquement, les autres passagers vous demanderont comment ça marche.")}
        </p>
        <ShareReferral
          code={a.code}
          link={link}
          text={t("Je voyage avec Send By Me et j'ai des kilos libres pour vos colis. Inscris-toi avec mon lien, {euros} offerts sur ton premier envoi :", { euros: euros(REFERRAL_REWARD_CENTS) })}
        />

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div className="print-area w-[340px] rounded-2xl bg-white p-5 shadow-[var(--shadow-tag)] ring-1 ring-line">
            <div className="flex items-center justify-between">
              <Logo />
              <span className="inline-flex items-center gap-1 rounded-full bg-signal/15 px-2 py-0.5 text-xs font-semibold text-signal-deep">
                <Award className="h-3.5 w-3.5" aria-hidden="true" />{" "}{t("Ambassadeur")}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="h-28 w-28 shrink-0" dangerouslySetInnerHTML={{ __html: qr }} />
              <div>
                <p className="text-lg leading-tight font-extrabold text-ink">{t("Envoyez un colis avec {firstName}", { firstName })}</p>
                <p className="mt-1 text-sm text-ink-soft">{t("Scannez : {euros} offerts sur votre premier envoi.", { euros: euros(REFERRAL_REWARD_CENTS) })}</p>
                <p className="wide tabular mt-2 text-sm font-bold tracking-widest text-brand">{a.code}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-muted">
              <Star className="h-3.5 w-3.5 fill-signal text-signal" aria-hidden="true" />{" "}{t("Voyageurs vérifiés · paiement en ligne · code de réception")}
            </p>
          </div>
          <PrintButton label={t("Imprimer la carte")} />
        </div>
      </section>

      {a.rewards.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold">{t("Vos primes")}</h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-white text-sm ring-1 ring-line">
            {a.rewards.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span>
                  {r.kind === "milestone" ? t("{milestone} livraisons réussies", { milestone: r.milestone ?? 0 }) : t("Filleul : première livraison")}
                  <span className="text-muted"> · {dayLabel(r.created_at, undefined, lang)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.paid_at ? "bg-ok-pale text-ok" : "bg-paper text-muted"}`}>
                    {r.paid_at ? t("Versée") : t("Avec votre prochain versement")}
                  </span>
                  <span className="tabular font-semibold text-ok">+{euros(r.amount_cents)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function AmbassadorPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-3xl" />}>
        <Ambassador />
      </Suspense>
    </PageShell>
  );
}
