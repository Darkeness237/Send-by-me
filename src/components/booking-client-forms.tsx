"use client";

import { useActionState, useEffect, useRef } from "react";
import { confirmDelivery, leaveReview, sendMessage } from "@/app/actions/bookings";
import { Button } from "@/components/ui/button";
import { FormMessage, Input, Textarea } from "@/components/ui/field";
import { useT } from "@/i18n/client";

export function DeliveryCodeForm({ bookingId }: { bookingId: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(confirmDelivery, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="booking_id" value={bookingId} />
      <label htmlFor="code" className="block text-sm font-semibold">
        {t("Code donné par le destinataire")}
      </label>
      <div className="flex gap-2">
        <Input id="code" name="code" inputMode="numeric" pattern="[0-9 ]{6,7}" maxLength={7} required placeholder="000000" className="wide tabular max-w-40 text-center text-xl tracking-[0.3em]" />
        <Button type="submit" disabled={pending}>
          {pending ? t("Vérification…") : t("Valider la réception")}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function MessageForm({ bookingId, inquiryId }: { bookingId?: string; inquiryId?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(sendMessage, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!pending && !state?.error) ref.current?.reset();
  }, [pending, state]);
  return (
    <form ref={ref} action={action} className="flex items-end gap-2">
      {bookingId && <input type="hidden" name="booking_id" value={bookingId} />}
      {inquiryId && <input type="hidden" name="inquiry_id" value={inquiryId} />}
      <label htmlFor="body" className="sr-only">
        {t("Votre message")}
      </label>
      <Textarea id="body" name="body" required maxLength={2000} rows={1} placeholder={t("Écrire un message")} className="min-h-12 flex-1 resize-none" />
      <Button type="submit" disabled={pending}>
        {t("Envoyer")}
      </Button>
      {state?.error && <FormMessage state={state} />}
    </form>
  );
}

export function ReviewForm({ bookingId, subject }: { bookingId: string; subject: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(leaveReview, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="booking_id" value={bookingId} />
      <fieldset>
        <legend className="text-sm font-semibold">{t("Votre note pour {subject}", { subject })}</legend>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="rating" value={n} required className="peer sr-only" />
              <span className="wide flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-line peer-checked:bg-signal peer-checked:ring-signal peer-focus-visible:outline-3 peer-focus-visible:outline-brand">
                {n}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Textarea name="comment" maxLength={600} placeholder={t("Comment s'est passé l'envoi ? (facultatif)")} aria-label={t("Commentaire")} />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {t("Publier mon avis")}
      </Button>
    </form>
  );
}
