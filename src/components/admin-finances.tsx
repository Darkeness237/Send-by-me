import Link from "next/link";
import { Info, Trash2 } from "lucide-react";
import { deleteExpense } from "@/app/actions/admin";
import { ExpenseForm } from "@/components/admin-forms";
import { dayLabel } from "@/lib/format";
import { EXPENSE_CATEGORIES, expenseLabel, getFinances, PERIODS, type Period } from "@/lib/finance";
import { euros, SECURITY_FEE_CENTS, STRIPE_FIXED_CENTS, STRIPE_RATE } from "@/lib/pricing";

// Page d'administration rendue à chaque visite : l'heure courante fait partie de la requête.
const nowMs = () => new Date().getTime();

type Line = { label: string; cents: number; sign: "+" | "−" | "="; explain: string; strong?: boolean };

function Ledger({ lines }: { lines: Line[] }) {
  return (
    <dl className="divide-y divide-line">
      {lines.map((l) => (
        <div key={l.label} className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3.5 ${l.sign === "=" ? "bg-paper -mx-5 px-5 sm:-mx-6 sm:px-6" : ""}`}>
          <dt className={l.strong ? "font-extrabold" : "font-semibold"}>
            <span className="tabular mr-2 inline-block w-3 text-muted" aria-hidden="true">
              {l.sign}
            </span>
            {l.label}
          </dt>
          <dd className={`tabular text-right ${l.strong ? "text-xl font-extrabold" : "font-bold"} ${l.sign === "−" ? "text-ink-soft" : ""} ${l.strong && l.cents < 0 ? "text-danger" : ""}`}>
            {l.sign === "−" && l.cents > 0 ? "−" : ""}
            {euros(l.cents)}
          </dd>
          <dd className="col-span-2 pl-5 text-sm text-muted">{l.explain}</dd>
        </div>
      ))}
    </dl>
  );
}

export async function AdminFinances({ period }: { period: Period }) {
  const now = nowMs();
  const f = await getFinances(period, now);
  const byCategory = EXPENSE_CATEGORIES.map(([k, label]) => ({ k, label, cents: f.expenses.filter((e) => e.category === k).reduce((a, e) => a + e.amount_cents, 0) })).filter((c) => c.cents > 0);
  const pct = `${(STRIPE_RATE * 100).toLocaleString("fr-FR")} % + ${euros(STRIPE_FIXED_CENTS)}`;

  const lines: Line[] = [
    { sign: "+", label: "Payé par les expéditeurs", cents: f.volume, explain: `${f.bookings} réservation${f.bookings > 1 ? "s" : ""} payée${f.bookings > 1 ? "s" : ""} sur la période (hors remboursements). C'est le montant débité sur les cartes.` },
    { sign: "−", label: "Part des voyageurs", cents: f.travelerShare, explain: "Prix du transport fixé par le voyageur (prix au kilo × poids). Il lui est reversé après la livraison : ce n'est pas un revenu de Send By Me." },
    { sign: "+", label: "Frais de service", cents: f.serviceFees, explain: `Ajoutés au prix par Send By Me : commission (selon le poids), forfait sécurité et suivi de ${euros(SECURITY_FEE_CENTS)} par envoi, et les frais bancaires refacturés à l'expéditeur.` },
    { sign: "+", label: "Livraisons à domicile", cents: f.deliveryFees, explain: "Option payée par l'expéditeur pour livrer le colis chez le destinataire. Le coût du livreur partenaire est à saisir en frais annexe (catégorie « Livreur partenaire »)." },
    { sign: "+", label: "Mises en avant", cents: f.boosts, explain: "Annonces mises en avant par les voyageurs, retenues sur leur premier versement." },
    { sign: "=", label: "Revenus Send By Me", cents: f.revenue, explain: "Ce que Send By Me garde avant ses propres coûts.", strong: true },
    { sign: "−", label: "Frais Stripe (estimés)", cents: f.stripe, explain: `Estimation prudente de ${pct} par paiement (carte hors Europe). Une carte européenne coûte moins cher : le montant réel est dans le tableau de bord Stripe. Un écart important ou un litige peut être saisi en frais annexe.` },
    { sign: "−", label: "Primes ambassadeurs", cents: f.rewards, explain: "Primes gagnées par les voyageurs ambassadeurs sur la période, versées ou à verser." },
    { sign: "−", label: "Frais annexes", cents: f.expensesTotal, explain: "Dépenses saisies par l'équipe ci-dessous : livreur, publicité, logiciels, emballages, gestes commerciaux…" },
    { sign: "=", label: "Résultat net estimé", cents: f.net, explain: "Revenus moins tous les coûts connus. Hors salaires, impôts et TVA.", strong: true },
  ];

  return (
    <div className="space-y-6">
      <nav aria-label="Période" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {PERIODS.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin?onglet=finances&periode=${k}`}
            aria-current={k === period ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${k === period ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft ring-line hover:ring-brand"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6" aria-labelledby="ledger">
          <h2 id="ledger" className="font-bold">
            Comment se calcule le résultat
          </h2>
          <p className="mt-1 flex items-start gap-2 text-sm text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Chaque ligne est expliquée. Les montants « payés » comptent à la date du paiement, les frais annexes à la date saisie.
          </p>
          <div className="mt-3">
            <Ledger lines={lines} />
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6" aria-labelledby="add-exp">
            <h2 id="add-exp" className="font-bold">
              Ajouter un frais annexe
            </h2>
            <p className="mt-1 mb-4 text-sm text-muted">Toute dépense de Send By Me qui n&apos;apparaît pas automatiquement : elle est déduite du résultat.</p>
            <ExpenseForm categories={EXPENSE_CATEGORIES} today={new Date(now).toISOString().slice(0, 10)} />
          </section>

          {byCategory.length > 0 && (
            <section className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6" aria-labelledby="by-cat">
              <h2 id="by-cat" className="font-bold">
                Frais annexes par catégorie
              </h2>
              <ul className="mt-4 space-y-2.5">
                {byCategory.map((c) => (
                  <li key={c.k} className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 text-sm">
                    <span className="truncate text-ink-soft">{c.label}</span>
                    <span className="h-2.5 rounded-full bg-paper" aria-hidden="true">
                      <span className="block h-2.5 rounded-full bg-brand" style={{ width: `${Math.max(3, (c.cents / f.expensesTotal) * 100)}%` }} />
                    </span>
                    <span className="tabular text-right font-bold">{euros(c.cents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <section className="rounded-3xl bg-white ring-1 ring-line" aria-labelledby="exp-list">
        <h2 id="exp-list" className="px-5 pt-5 font-bold sm:px-6">
          Frais annexes saisis
        </h2>
        {f.expenses.length ? (
          <ul className="mt-3 divide-y divide-line">
            {f.expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-4 px-5 py-3 sm:px-6">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.label}</span>
                  <span className="block text-sm text-muted">
                    {dayLabel(`${e.spent_on}T12:00:00Z`)} · {expenseLabel(e.category)}
                    {e.booking_id ? " · rattaché à un envoi" : ""}
                  </span>
                </span>
                <span className="tabular font-bold">{euros(e.amount_cents)}</span>
                <form action={deleteExpense}>
                  <input type="hidden" name="expense_id" value={e.id} />
                  <button type="submit" className="grid h-9 w-9 place-items-center rounded-full text-muted ring-1 ring-line hover:text-danger hover:ring-danger" aria-label={`Supprimer « ${e.label} »`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 pt-2 pb-5 text-sm text-muted sm:px-6">Aucun frais annexe sur cette période.</p>
        )}
      </section>
    </div>
  );
}
