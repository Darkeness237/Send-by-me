import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, ExternalLink, Lock, Trash2, Zap } from "lucide-react";
import { deletePayoutMethod, openStripeDashboard, startStripeOnboarding } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { CONNECT_COUNTRIES, syncConnectAccount } from "@/lib/stripe-connect";
import { isStripeConfigured } from "@/lib/stripe";
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

async function PayoutMethodView({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getT();
  const lang = await getLocale();
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil/versement");
  const supabase = await createClient();
  const [profile, { data }, connect, sp] = await Promise.all([
    getProfile(userId),
    supabase.from("payout_methods").select("*").eq("user_id", userId).maybeSingle(),
    isStripeConfigured ? syncConnectAccount(userId) : Promise.resolve(null),
    searchParams,
  ]);
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

      {isStripeConfigured && (
        <section className={`mt-6 rounded-3xl p-6 sm:p-8 ${connect?.transfers_active ? "bg-ok-pale ring-1 ring-ok/30" : "bg-white ring-2 ring-brand"}`} aria-labelledby="auto">
          <p className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-brand uppercase">
            <Zap className="h-4 w-4" aria-hidden="true" /> {t("Recommandé")}
          </p>
          <h2 id="auto" className="mt-1 text-xl font-bold">
            {t("Virements automatiques")}
          </h2>
          {connect?.transfers_active ? (
            <>
              <p className="mt-2 flex items-start gap-2 text-ink-soft">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden="true" />
                {t("Activés. Dès qu'une livraison est validée par le code du destinataire, votre part est virée automatiquement sur votre compte bancaire.")}
              </p>
              <form action={openStripeDashboard} className="mt-4">
                <Button type="submit" variant="outline">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" /> {t("Voir mes virements et mon IBAN sur Stripe")}
                </Button>
              </form>
            </>
          ) : connect ? (
            <>
              <p className="mt-2 text-ink-soft">{t("Votre inscription chez Stripe n'est pas terminée, ou est en cours de vérification.")}</p>
              <form action={startStripeOnboarding} className="mt-4">
                <input type="hidden" name="country" value={connect.country} />
                <Button type="submit">{t("Terminer mon inscription")}</Button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-ink-soft">
                {t("Votre part est virée sur votre compte bancaire dès que la livraison est validée, sans attendre. Notre partenaire de paiement Stripe vérifie votre identité et enregistre votre IBAN en quelques minutes.")}
              </p>
              <form action={startStripeOnboarding} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="w-full sm:min-w-0 sm:flex-1">
                  <span className="mb-1.5 block text-sm font-semibold">{t("Pays de votre compte bancaire")}</span>
                  <Select name="country" defaultValue="FR">
                    {CONNECT_COUNTRIES.map(([code, name]) => (
                      <option key={code} value={code}>
                        {t(name)}
                      </option>
                    ))}
                  </Select>
                </label>
                <Button type="submit" size="lg" className="w-full sm:w-auto">
                  {t("Activer les virements automatiques")}
                </Button>
              </form>
              <p className="mt-3 text-sm text-muted">{t("Compte bancaire hors de ces pays, ou Mobile Money ? Utilisez le formulaire ci-dessous : nous vous versons vos gains à la main.")}</p>
            </>
          )}
          {sp.stripe === "erreur" && (
            <p role="alert" className="mt-4 rounded-xl bg-danger-pale px-4 py-3 text-sm text-danger">
              {t("Stripe n'a pas pu ouvrir l'inscription. Réessayez dans quelques minutes, ou utilisez le formulaire ci-dessous.")}
            </p>
          )}
          {sp.stripe === "indisponible" && (
            <p role="alert" className="mt-4 rounded-xl bg-danger-pale px-4 py-3 text-sm text-danger">
              {t("Les virements automatiques ne sont pas encore ouverts. Enregistrez votre IBAN ou votre Mobile Money ci-dessous : nous vous versons vos gains à la main en attendant.")}
            </p>
          )}
          {sp.stripe === "retour" && !connect?.transfers_active && (
            <p role="status" className="mt-4 rounded-xl bg-brand-pale px-4 py-3 text-sm text-brand-deep">
              {t("Merci ! Stripe vérifie vos informations. Cette page affichera « Activés » dès que c'est validé.")}
            </p>
          )}
        </section>
      )}

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
        <h2 className="mb-1 text-lg font-bold">{current ? t("Modifier mon moyen de versement") : isStripeConfigured ? t("Ou : versement manuel (Mobile Money, autre banque)") : t("Ajouter un moyen de versement")}</h2>
        <p className="mb-5 text-sm text-muted">{t("Nous vous versons vos gains à la main, dans les jours qui suivent la livraison.")}</p>
        <PayoutMethodForm current={current} holder={profile?.full_name ?? ""} />
      </section>

      <p className="mt-5 flex items-start gap-2 text-sm text-muted">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {t("Ces coordonnées ne sont jamais montrées aux autres membres. Seule l'équipe Send By Me les utilise, pour vous verser vos gains.")}
      </p>
    </div>
  );
}

export default function PayoutMethodPage(props: PageProps<"/[lang]/espace/profil/versement">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-2xl" />}>
        <PayoutMethodView searchParams={props.searchParams as Promise<Record<string, string | undefined>>} />
      </Suspense>
    </PageShell>
  );
}
