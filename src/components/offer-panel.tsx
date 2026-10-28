"use client";

import { HandCoins } from "lucide-react";
import { useActionState } from "react";
import { answerOffer, makeOffer } from "@/app/actions/offers";
import { Button } from "@/components/ui/button";
import { FormMessage, Input } from "@/components/ui/field";
import { euros } from "@/lib/pricing";
import type { PriceOffer } from "@/lib/types";

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
  const [state, action, pending] = useActionState(makeOffer, null);
  const open = offers.find((o) => o.status === "pending");
  const mine = open?.author_id === myId;
  const history = offers.filter((o) => o.status !== "pending").slice(-3);

  return (
    <div className="rounded-2xl bg-paper p-5">
      <h3 className="flex items-center gap-2 font-bold">
        <HandCoins className="h-5 w-5 text-brand" aria-hidden="true" /> Négocier le prix
      </h3>
      <p className="mt-1 text-sm text-muted">
        Prix en vigueur : <b className="text-ink">{euros(currentCents)} le kilo</b>
        {currentCents !== listedCents && ` (annoncé ${euros(listedCents)})`}, soit {euros(Math.round(currentCents * weightKg))} pour {weightKg} kg.
      </p>

      {history.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-ink-soft">
          {history.map((o) => (
            <li key={o.id}>
              {o.author_id === myId ? "Vous avez proposé" : `${otherName} a proposé`} {euros(o.price_per_kg_cents)} le kilo ·{" "}
              <span className={o.status === "accepted" ? "font-semibold text-ok" : "text-muted"}>
                {o.status === "accepted" ? "acceptée" : o.status === "declined" ? "refusée" : "remplacée"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-line">
          <p className="font-semibold">
            {mine ? "Votre proposition" : `Proposition de ${otherName}`} : {euros(open.price_per_kg_cents)} le kilo
          </p>
          <p className="text-sm text-muted">Soit {euros(Math.round(open.price_per_kg_cents * weightKg))} pour {weightKg} kg (hors frais de service).</p>
          {mine ? (
            <p className="mt-2 text-sm text-ink-soft">En attente de la réponse de {otherName}.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={answerOffer.bind(null, open.id, true)}>
                <Button type="submit" size="sm">Accepter ce prix</Button>
              </form>
              <form action={answerOffer.bind(null, open.id, false)}>
                <Button type="submit" size="sm" variant="outline">Refuser</Button>
              </form>
            </div>
          )}
        </div>
      )}

      {!mine && (
        <form action={action} className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="booking_id" value={bookingId} />
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-sm font-semibold">{open ? "Contre-proposition (€ / kg)" : "Proposer un prix (€ / kg)"}</span>
            <Input name="price" type="number" min={1} max={100} step={0.5} required placeholder={String(Math.max(1, Math.round(currentCents * 0.85) / 100))} />
          </label>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Envoi…" : "Proposer"}
          </Button>
        </form>
      )}
      <div className="mt-2">
        <FormMessage state={state} />
      </div>
    </div>
  );
}
