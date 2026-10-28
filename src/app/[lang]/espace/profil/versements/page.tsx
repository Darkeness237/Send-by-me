import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Award, CheckCircle2, Clock, Wallet } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { dayLabel } from "@/lib/format";
import { codeFor } from "@/lib/places";
import { euros } from "@/lib/pricing";
import { createClient, getUserId } from "@/lib/supabase/server";
import { getLocale, getT } from "@/i18n/server";
import { BackLink } from "@/components/ui/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Versements reçus"), robots: { index: false } };
}

type Row = {
  id: string;
  base_cents: number;
  payout_status: "not_due" | "due" | "paid";
  payout_reference: string | null;
  paid_out_at: string | null;
  delivered_at: string | null;
  trip: { from_city: string; to_city: string } | { from_city: string; to_city: string }[] | null;
};
const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);

async function Payouts() {
  const t = await getT();
  const lang = await getLocale();
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil/versements");
  const supabase = await createClient();
  const [{ data: rows }, { data: rewards }, { data: method }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, base_cents, payout_status, payout_reference, paid_out_at, delivered_at, trip:trips!inner(from_city, to_city, traveler_id)")
      .eq("trip.traveler_id", userId)
      .in("payout_status", ["due", "paid"])
      .order("delivered_at", { ascending: false })
      .limit(100),
    supabase.from("ambassador_rewards").select("id, kind, amount_cents, milestone, created_at, paid_at").eq("traveler_id", userId).order("created_at", { ascending: false }),
    supabase.from("payout_methods").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  const list = (rows ?? []) as Row[];
  const due = list.filter((r) => r.payout_status === "due").reduce((a, r) => a + r.base_cents, 0) + (rewards ?? []).filter((r) => !r.paid_at).reduce((a, r) => a + r.amount_cents, 0);
  const paid = list.filter((r) => r.payout_status === "paid").reduce((a, r) => a + r.base_cents, 0) + (rewards ?? []).filter((r) => r.paid_at).reduce((a, r) => a + r.amount_cents, 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <BackLink href="/espace/profil?onglet=compte" label={t("Compte")} />
      <h1 className="display mt-4 text-3xl sm:text-4xl">{t("Versements reçus")}</h1>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-card p-5 ring-1 ring-line">
          <dt className="text-sm text-muted">{t("À recevoir")}</dt>
          <dd className="tabular mt-1 text-2xl font-extrabold">{euros(due)}</dd>
        </div>
        <div className="rounded-3xl bg-card p-5 ring-1 ring-line">
          <dt className="text-sm text-muted">{t("Déjà versé")}</dt>
          <dd className="tabular mt-1 text-2xl font-extrabold text-ok">{euros(paid)}</dd>
        </div>
      </dl>

      {!method && (
        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-3xl bg-signal/15 p-5">
          <p className="min-w-0 flex-1 font-semibold">{t("Ajoutez votre IBAN ou votre numéro Mobile Money pour recevoir vos gains.")}</p>
          <ButtonLink href="/espace/profil/versement" size="sm" variant="signal">
            {t("Ajouter")}
          </ButtonLink>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold">{t("Vos trajets")}</h2>
        {list.length ? (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl bg-card ring-1 ring-line">
            {list.map((r) => {
              const trip = one(r.trip);
              return (
                <li key={r.id} className="flex items-center gap-4 px-5 py-4">
                  <Wallet className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                  <Link href={`/reservations/${r.id}`} className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {codeFor(trip?.from_city ?? "")} › {codeFor(trip?.to_city ?? "")}
                    </span>
                    <span className="block text-sm text-muted">
                      {r.payout_status === "paid"
                        ? t("Versé le {date}", { date: dayLabel(r.paid_out_at ?? r.delivered_at ?? "", undefined, lang) }) + (r.payout_reference ? ` · ${r.payout_reference}` : "")
                        : t("Livré le {date} · versement en préparation", { date: dayLabel(r.delivered_at ?? "", undefined, lang) })}
                    </span>
                  </Link>
                  <span className="text-right">
                    <span className="tabular block font-bold">{euros(r.base_cents)}</span>
                    {r.payout_status === "paid" ? (
                      <CheckCircle2 className="ml-auto h-4 w-4 text-ok" aria-label={t("Versé")} />
                    ) : (
                      <Clock className="ml-auto h-4 w-4 text-signal-deep" aria-label={t("À recevoir")} />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-3xl bg-card p-6 text-muted ring-1 ring-line">{t("Aucun versement pour l'instant. Ils apparaissent ici dès qu'une livraison est validée.")}</p>
        )}
      </section>

      {(rewards ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">{t("Primes Ambassadeur")}</h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl bg-card ring-1 ring-line">
            {(rewards ?? []).map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-5 py-4">
                <Award className="h-5 w-5 shrink-0 text-signal-deep" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {r.kind === "milestone" ? t("{milestone} livraisons réussies", { milestone: r.milestone ?? 0 }) : t("Filleul : première livraison")}
                  </span>
                  <span className="block text-sm text-muted">{r.paid_at ? t("Versée") : t("Avec votre prochain versement")}</span>
                </span>
                <span className="tabular font-bold">{euros(r.amount_cents)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-2xl" />}>
        <Payouts />
      </Suspense>
    </PageShell>
  );
}
