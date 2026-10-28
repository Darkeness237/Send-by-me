"use client";

import { HandCoins } from "lucide-react";
import { useActionState } from "react";
import { answerOffer, makeOffer } from "@/app/actions/offers";
import { Button } from "@/components/ui/button";
import { FormMessage, Input } from "@/components/ui/field";
import { euros } from "@/lib/pricing";
import type { PriceOffer } from "@/lib/types";
import { useT } from "@/i18n/client";

/**
 * Négociation du prix au kilo tant que le voyageur n'a pas accepté la demande :
 * l'expéditeur propose, le voyageur accepte, refuse ou fait une contre-proposition.
 */
export function OfferPanel({
  bookingId,
  myId,
  offers,
  currentCents,
  listedCents,
  weightKg,
  otherName,
}: {
  bookingId: string;
  myId: string;
  offers: PriceOffer[];
  currentCents: number;
  listedCents: number;
  weightKg: number;
  otherName: string;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(makeOffer, null);
  const open = offers.find((o) => o.status === "pending");
  const mine = open?.author_id === myId;
  const history = offers.filter((o) => o.status !== "pending").slice(-3);

  return (
    <div className="rounded-2xl bg-paper p-5">
      <h3 className="flex items-center gap-2 font-bold">
        <HandCoins className="h-5 w-5 text-brand" aria-hidden="true" />{" "}{t("Négocier le prix")}
      </h3>
      <p className="mt-1 text-sm text-muted">
        {t("Prix en vigueur :")}{" "}<b className="text-ink">{t("{euros} le kilo", { euros: euros(currentCents) })}
      </b>
        {currentCents !== listedCents && t(" (annoncé {euros})", { euros: euros(listedCents) })}
        {t(", soit {euros} pour {weightKg} kg.", { euros: euros(Math.round(currentCents * weightKg)), weightKg })}
      </p>

      {history.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-ink-soft">
          {history.map((o) => (
            <li key={o.id}>
              {o.author_id === myId ? t("Vous avez proposé {euros} le kilo", { euros: euros(o.price_per_kg_cents) }) : t("{otherName} a proposé {euros} le kilo", { otherName, euros: euros(o.price_per_kg_cents) })} ·{" "}
              <span className={o.status === "accepted" ? "font-semibold text-ok" : "text-muted"}>
                {o.status === "accepted" ? t("acceptée") : o.status === "declined" ? t("refusée") : t("remplacée")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-line">
          <p className="font-semibold">
            {mine ? t("Votre proposition : {euros} le kilo", { euros: euros(open.price_per_kg_cents) }) : t("Proposition de {otherName} : {euros} le kilo", { otherName, euros: euros(open.price_per_kg_cents) })}
          </p>
          <p className="text-sm text-muted">{t("Soit {euros} pour {weightKg} kg (hors frais de service).", { euros: euros(Math.round(open.price_per_kg_cents * weightKg)), weightKg })}</p>
          {mine ? (
            <p className="mt-2 text-sm text-ink-soft">{t("En attente de la réponse de {otherName}.", { otherName })}</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={answerOffer.bind(null, open.id, true)}>
                <Button type="submit" size="sm">{t("Accepter ce prix")}</Button>
              </form>
              <form action={answerOffer.bind(null, open.id, false)}>
                <Button type="submit" size="sm" variant="outline">{t("Refuser")}</Button>
              </form>
            </div>
          )}
        </div>
      )}

      {!mine && (
        <form action={action} className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="booking_id" value={bookingId} />
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-sm font-semibold">{open ? t("Contre-proposition (€ / kg)") : t("Proposer un prix (€ / kg)")}</span>
            <Input name="price" type="number" min={1} max={100} step={0.5} required placeholder={String(Math.max(1, Math.round(currentCents * 0.85) / 100))} />
          </label>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? t("Envoi…") : t("Proposer")}
          </Button>
        </form>
      )}
      <div className="mt-2">
        <FormMessage state={state} />
      </div>
    </div>
  );
}
