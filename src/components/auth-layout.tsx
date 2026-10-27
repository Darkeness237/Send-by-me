import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export function AuthLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="hidden flex-col justify-between bg-ink p-10 text-white lg:flex">
        <Link href="/" aria-label="Accueil">
          <Logo tone="light" />
        </Link>
        <div className="max-w-md">
          <p className="display text-3xl leading-tight">Un compte pour envoyer vos colis et rentabiliser vos kilos libres.</p>
          <p className="mt-4 text-white/60">
            Le voyageur n&apos;est payé qu&apos;une fois que votre destinataire a donné son code de remise.
          </p>
        </div>
        <p className="text-sm text-white/50">Paiement bloqué jusqu&apos;à la livraison · Identités vérifiées</p>
      </div>
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Link href="/" aria-label="Accueil" className="lg:hidden">
          <Logo />
        </Link>
        <div className="mx-auto my-auto w-full max-w-md py-10">
          <h1 className="display text-3xl sm:text-4xl">{title}</h1>
          <p className="mt-3 text-muted">{intro}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
