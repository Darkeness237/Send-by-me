import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Lock, Trash2 } from "lucide-react";
import { deletePayoutMethod } from "@/app/actions/account";
import { PageShell } from "@/components/page-shell";
import { PayoutMethodForm } from "@/components/payout-method-form";
import { getProfile } from "@/lib/data";
import { maskIban, maskPhone, operatorLabel, type PayoutMethod } from "@/lib/payout";
import { createClient, getUserId } from "@/lib/supabase/server";
import { getLocale, getT } from "@/i18n/server";
import { longDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Moyen de versement"), robots: { index: false } };
}

async function PayoutMethodView() {
  const t = await getT();
  const lang = await getLocale();
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil/versement");
  const supabase = await createClient();
  const [profile, { data }] = await Promise.all([getProfile(userId), supabase.from("payout_methods").select("*").eq("user_id", userId).maybeSingle()]);
  const current = data as PayoutMethod | null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/espace/profil?onglet=compte" className="text-sm font-semibold text-brand">
        {t("← Compte")}
      </Link>
      <h1 className="display mt-4 text-3xl sm:text-4xl">{t("Moyen de versement")}</h1>
      <p className="mt-2 text-ink-soft">
        {t("Vos gains de voyageur et vos primes sont versés ici, dans les jours qui suivent chaque livraison validée par le code du destinataire.")}
      </p>

      {current && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-3xl bg-ink p-5 text-white">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white/70">{t("Moyen enregistré")}</p>
            <p className="tabular mt-1 text-lg font-bold">
              {current.kind === "iban" ? maskIban(current.iban ?? "") : `${t(operatorLabel(current.mobile_operator))} · ${maskPhone(current.mobile_number ?? "")}`}
            </p>
            <p className="text-sm text-white/70">
              {current.holder_name} · {t("mis à jour le {date}", { date: longDate(current.updated_at, undefined, lang) })}
            </p>
          </div>
          <form action={deletePayoutMethod}>
            <button type="submit" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white/80 ring-1 ring-white/30 hover:bg-white/10">
              <Trash2 className="h-4 w-4" aria-hidden="true" /> {t("Supprimer")}
            </button>
          </form>
        </div>
      )}

      <section className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
        <h2 className="mb-5 text-lg font-bold">{current ? t("Modifier mon moyen de versement") : t("Ajouter un moyen de versement")}</h2>
        <PayoutMethodForm current={current} holder={profile?.full_name ?? ""} />
      </section>

      <p className="mt-5 flex items-start gap-2 text-sm text-muted">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {t("Ces coordonnées ne sont jamais montrées aux autres membres. Seule l'équipe Send By Me les utilise, pour vous verser vos gains.")}
      </p>
    </div>
  );
}

export default function PayoutMethodPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-2xl" />}>
        <PayoutMethodView />
      </Suspense>
    </PageShell>
  );
}
