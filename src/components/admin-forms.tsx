"use client";

import { useActionState } from "react";
import { markPayoutPaid, refundBooking, resolveReport } from "@/app/actions/admin";
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
