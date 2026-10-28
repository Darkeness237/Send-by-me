import "server-only";

import { STRIPE_FIXED_CENTS, STRIPE_RATE } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

export const EXPENSE_CATEGORIES = [
  ["livraison", "Livreur partenaire"],
  ["stripe", "Frais Stripe réels / litiges"],
  ["marketing", "Publicité et flyers"],
  ["logiciel", "Logiciels et hébergement"],
  ["materiel", "Emballages et matériel"],
  ["geste_commercial", "Geste commercial"],
  ["autre", "Autre"],
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number][0];
export const expenseLabel = (c: string) => EXPENSE_CATEGORIES.find(([k]) => k === c)?.[1] ?? c;

export const PERIODS = [
  ["30j", "30 derniers jours"],
  ["mois", "Mois en cours"],
  ["mois-1", "Mois dernier"],
  ["tout", "Depuis le début"],
] as const;
export type Period = (typeof PERIODS)[number][0];

/** Bornes [début, fin[ de la période, en dates ISO (fuseau Paris approché par UTC, suffisant pour un suivi mensuel). */
export function periodRange(p: Period, nowMs: number): { from: string | null; to: string } {
  const now = new Date(nowMs);
  const to = new Date(nowMs + 1000).toISOString();
  if (p === "tout") return { from: null, to };
  if (p === "30j") return { from: new Date(nowMs - 30 * 86_400_000).toISOString(), to };
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (p === "mois-1" ? 1 : 0), 1));
  const end = p === "mois-1" ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString() : to;
  return { from: start.toISOString(), to: end };
}

/** Frais Stripe estimés sur un paiement : même hypothèse prudente que le calcul des prix. */
export const stripeEstimate = (totalCents: number) => Math.round(totalCents * STRIPE_RATE) + STRIPE_FIXED_CENTS;

export type Expense = { id: number; spent_on: string; category: string; label: string; amount_cents: number; booking_id: string | null };

export type Finances = {
  bookings: number;
  volume: number; // payé par les expéditeurs
  travelerShare: number; // reversé aux voyageurs
  serviceFees: number; // commission + forfait sécurité + frais bancaires refacturés
  deliveryFees: number; // livraison à domicile
  boosts: number; // mises en avant payées par les voyageurs
  stripe: number; // frais Stripe estimés
  rewards: number; // primes ambassadeurs dues sur la période
  expenses: Expense[];
  expensesTotal: number;
  revenue: number;
  net: number;
};

export async function getFinances(period: Period, nowMs: number): Promise<Finances> {
  const db = createAdminClient();
  const { from, to } = periodRange(period, nowMs);
  const since = <T extends { gte: (c: string, v: string) => T }>(q: T, col: string) => (from ? q.gte(col, from) : q);
  const [{ data: rows }, { data: boosted }, { data: rewards }, { data: expenses }] = await Promise.all([
    since(db.from("bookings").select("total_cents, base_cents, fee_cents, delivery_cents").in("status", ["paid", "picked_up", "delivered"]).lt("paid_at", to), "paid_at").limit(10000),
    since(db.from("trips").select("boost_fee_cents").gt("boost_fee_cents", 0).lt("boosted_at", to), "boosted_at").limit(10000),
    since(db.from("ambassador_rewards").select("amount_cents").lt("created_at", to), "created_at").limit(10000),
    since(db.from("admin_expenses").select("id, spent_on, category, label, amount_cents, booking_id").lt("spent_on", period === "mois-1" ? to.slice(0, 10) : "9999-12-31"), "spent_on")
      .order("spent_on", { ascending: false })
      .order("id", { ascending: false })
      .limit(500),
  ]);
  const sum = <T,>(list: T[] | null, f: (r: T) => number) => (list ?? []).reduce((a, r) => a + (f(r) || 0), 0);
  type B = { total_cents: number; base_cents: number; fee_cents: number; delivery_cents: number | null };
  const b = (rows ?? []) as B[];
  const f = {
    bookings: b.length,
    volume: sum(b, (r) => r.total_cents),
    travelerShare: sum(b, (r) => r.base_cents),
    serviceFees: sum(b, (r) => r.fee_cents),
    deliveryFees: sum(b, (r) => r.delivery_cents ?? 0),
    boosts: sum(boosted as { boost_fee_cents: number }[] | null, (r) => r.boost_fee_cents),
    stripe: sum(b, (r) => stripeEstimate(r.total_cents)),
    rewards: sum(rewards as { amount_cents: number }[] | null, (r) => r.amount_cents),
    expenses: (expenses ?? []) as Expense[],
  };
  const expensesTotal = sum(f.expenses, (e) => e.amount_cents);
  const revenue = f.serviceFees + f.deliveryFees + f.boosts;
  return { ...f, expensesTotal, revenue, net: revenue - f.stripe - f.rewards - expensesTotal };
}
