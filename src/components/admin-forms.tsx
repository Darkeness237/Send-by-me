"use client";

import { useActionState } from "react";
import { markPayoutPaid, markRewardsPaid, refundBooking, resolveReport, reviewIdentity, reviewTripProof } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { FormMessage, Input } from "@/components/ui/field";

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
