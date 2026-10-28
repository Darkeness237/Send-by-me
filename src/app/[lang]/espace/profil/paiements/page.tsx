import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CreditCard, RotateCcw } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { dayLabel } from "@/lib/format";
import { codeFor } from "@/lib/places";
import { euros } from "@/lib/pricing";
import { createClient, getUserId } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/types";
import { getLocale, getT } from "@/i18n/server";
import { BackLink } from "@/components/ui/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Paiements et remboursements"), robots: { index: false } };
}

type Row = {
  id: string;
  status: BookingStatus;
  total_cents: number;
  paid_at: string | null;
  refunded_at: string | null;
  trip: { from_city: string; to_city: string } | { from_city: string; to_city: string }[] | null;
};
const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);

async function Payments() {
  const t = await getT();
  const lang = await getLocale();
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil/paiements");
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, status, total_cents, paid_at, refunded_at, trip:trips(from_city, to_city)")
    .eq("sender_id", userId)
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(100);
  const list = (data ?? []) as Row[];
  const spent = list.filter((r) => !r.refunded_at).reduce((a, r) => a + r.total_cents, 0);
  const refunded = list.filter((r) => r.refunded_at).reduce((a, r) => a + r.total_cents, 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <BackLink href="/espace/profil?onglet=compte" label={t("Compte")} />
      <h1 className="display mt-4 text-3xl sm:text-4xl">{t("Paiements et remboursements")}</h1>
      <p className="mt-2 text-ink-soft">{t("Paiements par carte, sécurisés par Stripe. Le montant reste bloqué jusqu'à la livraison.")}</p>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-card p-5 ring-1 ring-line">
          <dt className="text-sm text-muted">{t("Payé")}</dt>
          <dd className="tabular mt-1 text-2xl font-extrabold">{euros(spent)}</dd>
        </div>
        <div className="rounded-3xl bg-card p-5 ring-1 ring-line">
          <dt className="text-sm text-muted">{t("Remboursé")}</dt>
          <dd className="tabular mt-1 text-2xl font-extrabold">{euros(refunded)}</dd>
        </div>
      </dl>

      {list.length ? (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-3xl bg-card ring-1 ring-line">
          {list.map((r) => {
            const trip = one(r.trip);
            const Icon = r.refunded_at ? RotateCcw : CreditCard;
            return (
              <li key={r.id}>
                <Link href={`/reservations/${r.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper">
                  <Icon className={`h-5 w-5 shrink-0 ${r.refunded_at ? "text-ok" : "text-brand"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {codeFor(trip?.from_city ?? "")} › {codeFor(trip?.to_city ?? "")}
                    </span>
                    <span className="block text-sm text-muted">
                      {r.refunded_at
                        ? t("Remboursé le {date}", { date: dayLabel(r.refunded_at, undefined, lang) })
                        : t("Payé le {date}", { date: dayLabel(r.paid_at ?? "", undefined, lang) })}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="tabular font-bold">{euros(r.total_cents)}</span>
                    <StatusBadge status={r.status} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 rounded-3xl bg-card p-6 text-muted ring-1 ring-line">{t("Aucun paiement pour l'instant.")}</p>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-2xl" />}>
        <Payments />
      </Suspense>
    </PageShell>
  );
}
