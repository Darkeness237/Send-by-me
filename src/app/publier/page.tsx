import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { PublishForm } from "@/components/publish-form";
import { getMarketPrices } from "@/lib/data";

export const metadata: Metadata = {
  title: "Proposer mes kilos",
  description: "Publiez votre trajet et rentabilisez la place libre dans votre valise. Gratuit pour les voyageurs.",
};

async function FormWithPrices() {
  return <PublishForm market={await getMarketPrices()} />;
}

export default function PublishPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="display text-3xl sm:text-4xl">Proposer mes kilos</h1>
        <p className="mt-3 max-w-xl text-muted">
          Vous recevrez des demandes que vous pourrez accepter ou refuser. Le paiement vous est versé après la remise du colis.
        </p>
        <div className="mt-8">
          <Suspense fallback={<div className="h-[120vh] animate-pulse rounded-3xl bg-white ring-1 ring-line" />}>
            <FormWithPrices />
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}
