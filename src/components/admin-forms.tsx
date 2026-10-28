"use client";

import { useActionState, useEffect, useRef } from "react";
import { addExpense, markPayoutPaid, markRewardsPaid, refundBooking, resolveReport, reviewIdentity, reviewTripProof, payoutViaStripe } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";

export function ResolveReportForm({ reportId }: { reportId: number }) {
  const [state, action, pending] = useActionState(resolveReport, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="report_id" value={reportId} />
      <label className="sr-only" htmlFor={`res-${reportId}`}>
        Décision
      </label>
      <Input id={`res-${reportId}`} name="resolution" required placeholder="Décision prise (remboursé, avertissement…)" className="min-w-60 flex-1" />
      <Button type="submit" size="sm" disabled={pending} className="mt-1.5">
        Clore
      </Button>
      {state?.error && <FormMessage state={state} />}
    </form>
  );
}

export function PayoutForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(markPayoutPaid, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="booking_id" value={bookingId} />
      <label className="sr-only" htmlFor={`ref-${bookingId}`}>
        Référence du virement
      </label>
      <Input id={`ref-${bookingId}`} name="reference" required placeholder="Référence du virement" className="w-56" />
      <Button type="submit" size="sm" disabled={pending} className="mt-1.5">
        Marquer versé
      </Button>
      {state?.error && <FormMessage state={state} />}
    </form>
  );
}

/** Compte Stripe du voyageur actif : virement automatique (ou relance si le premier a échoué). */
export function StripePayoutButton({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(payoutViaStripe, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="booking_id" value={bookingId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Virement…" : "Verser via Stripe"}
      </Button>
      {state?.error && <FormMessage state={state} />}
    </form>
  );
}

export function RewardsPayoutForm({ travelerId }: { travelerId: string }) {
  const [state, action, pending] = useActionState(markRewardsPaid, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="traveler_id" value={travelerId} />
      <label className="sr-only" htmlFor={`rref-${travelerId}`}>
        Référence du virement
      </label>
      <Input id={`rref-${travelerId}`} name="reference" required placeholder="Référence du virement" className="w-56" />
      <Button type="submit" size="sm" disabled={pending} className="mt-1.5">
        Marquer versées
      </Button>
      {state?.error && <FormMessage state={state} />}
    </form>
  );
}

export function RefundForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(refundBooking, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Rembourser intégralement l'expéditeur ? Cette action est définitive.")) e.preventDefault();
      }}
      className="flex flex-col items-end gap-2"
    >
      <input type="hidden" name="booking_id" value={bookingId} />
      <Button type="submit" size="sm" variant="danger" disabled={pending}>
        {pending ? "Remboursement…" : "Rembourser"}
      </Button>
      {state?.error && <FormMessage state={state} />}
    </form>
  );
}

export function ReviewForm({ kind, id }: { kind: "identity" | "trip"; id: string }) {
  const [state, action, pending] = useActionState(kind === "identity" ? reviewIdentity : reviewTripProof, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name={kind === "identity" ? "verification_id" : "trip_id"} value={id} />
      <Input name="reason" placeholder="Motif en cas de refus (photo floue, pièce expirée…)" aria-label="Motif du refus" />
      <div className="flex gap-2">
        <Button type="submit" name="decision" value="approved" size="sm" disabled={pending}>
          Valider
        </Button>
        <Button type="submit" name="decision" value="rejected" size="sm" variant="danger" disabled={pending}>
          Refuser
        </Button>
      </div>
      {state?.error && <FormMessage state={state} />}
    </form>
  );
}

/** Saisie d'un frais annexe : il vient en déduction du résultat de Send By Me. */
export function ExpenseForm({ categories, today }: { categories: readonly (readonly [string, string])[]; today: string }) {
  const [state, action, pending] = useActionState(addExpense, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Montant (€)" htmlFor="exp-amount">
        <Input id="exp-amount" name="amount" required inputMode="decimal" placeholder="12,50" className="tabular" />
      </Field>
      <Field label="Date" htmlFor="exp-date">
        <Input id="exp-date" name="spent_on" type="date" required defaultValue={today} max="2100-12-31" />
      </Field>
      <Field label="Catégorie" htmlFor="exp-cat">
        <Select id="exp-cat" name="category" required defaultValue="">
          <option value="" disabled>
            Choisir
          </option>
          {categories.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="N° de suivi (facultatif)" htmlFor="exp-track" hint="Pour rattacher la dépense à un envoi.">
        <Input id="exp-track" name="tracking_code" maxLength={40} placeholder="SBM-…" className="uppercase" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description" htmlFor="exp-label">
          <Input id="exp-label" name="label" required maxLength={140} placeholder="Course livreur Douala, campagne Facebook, rouleau de scotch…" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Ajouter la dépense"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
