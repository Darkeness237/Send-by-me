import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Gift, PackageCheck, UserPlus } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { ShareReferral } from "@/components/share-referral";
import { getReferralStats } from "@/lib/data";
import { dayLabel } from "@/lib/format";
import { euros } from "@/lib/pricing";
import { REFERRAL_REWARD_CENTS, referralLink } from "@/lib/referral";
import { getUserId } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Parrainage", robots: { index: false } };

const REASON: Record<string, string> = {
  referral_welcome: "Bienvenue (parrainage)",
  referral_reward: "Filleul : première livraison réussie",
  booking: "Utilisé sur une réservation",
  booking_release: "Rendu (réservation annulée)",
};

async function Referral() {
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/parrainage");
  const stats = await getReferralStats(userId);
  const reward = euros(REFERRAL_REWARD_CENTS);
  const rewarded = stats.referrals.filter((r) => r.status === "rewarded").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/espace" className="text-sm font-semibold text-brand">
        ← Mon espace
      </Link>
      <h1 className="display mt-4 text-3xl sm:text-4xl">Parrainez vos proches</h1>
      <p className="mt-2 max-w-xl text-muted">
        Partagez votre lien. Vos filleuls reçoivent {reward} sur les frais de leur premier envoi, et vous gagnez {reward} de crédit dès
        leur première livraison réussie.
      </p>

      <section className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
        <h2 className="mb-4 font-bold">Votre code de parrainage</h2>
        <ShareReferral
          code={stats.code}
          link={referralLink(stats.code)}
          text={`J'envoie mes colis avec Send By Me, des voyageurs vérifiés qui ont des kilos libres. Inscris-toi avec mon lien et reçois ${reward} offerts sur ton premier envoi :`}
        />
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: UserPlus, label: "Filleuls inscrits", value: String(stats.referrals.length) },
          { icon: PackageCheck, label: "Premières livraisons", value: String(rewarded) },
          { icon: Gift, label: "Crédit disponible", value: euros(Math.max(0, stats.balance)) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
            <p className="wide tabular mt-3 text-2xl font-extrabold">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="font-bold">Comment ça marche</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            "Envoyez votre lien à un proche par WhatsApp, SMS ou e-mail.",
            `Il s'inscrit avec votre lien : ${reward} sont déduits des frais de son premier envoi.`,
            `Après sa première livraison (envoi ou trajet), vous recevez ${reward} de crédit.`,
          ].map((t, i) => (
            <li key={i} className="rounded-2xl bg-paper p-4 text-sm">
              <span className="wide mb-1 block text-lg font-extrabold text-brand">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">
          Le crédit s&apos;applique automatiquement sur les frais de service de vos prochaines réservations. Il ne s&apos;échange pas contre
          de l&apos;argent. Il est rendu si la réservation est refusée ou annulée.
        </p>
      </section>

      {stats.referrals.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold">Vos filleuls</h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
            {stats.referrals.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="font-semibold">{r.name}</span>
                <span className="text-sm text-muted">inscrit le {dayLabel(r.created_at)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === "rewarded" ? "bg-ok-pale text-ok" : "bg-paper text-muted"}`}>
                  {r.status === "rewarded" ? `+${reward} gagnés` : "En attente de sa 1re livraison"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats.credits.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold">Historique du crédit</h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line text-sm">
            {stats.credits.map((c, i) => (
              <li key={i} className="flex justify-between gap-3 px-5 py-3">
                <span>
                  {REASON[c.reason] ?? c.reason} <span className="text-muted">· {dayLabel(c.created_at)}</span>
                </span>
                <span className={`tabular font-semibold ${c.amount_cents > 0 ? "text-ok" : "text-ink"}`}>
                  {c.amount_cents > 0 ? "+" : "−"}
                  {euros(Math.abs(c.amount_cents))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function ReferralPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-3xl" />}>
        <Referral />
      </Suspense>
    </PageShell>
  );
}
