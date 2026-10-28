import Image from "next/image";
import Link from "next/link";
import aeroport from "../../public/images/aeroport-depart.jpg";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export function AuthLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex">
        <Image src={aeroport} alt="" fill placeholder="blur" sizes="50vw" className="object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" aria-hidden="true" />
        <Link href="/" aria-label="Accueil" className="relative">
          <Logo tone="light" />
        </Link>
        <div className="relative max-w-md">
          <p className="display text-3xl leading-tight">Un compte pour envoyer vos colis et rentabiliser vos kilos libres.</p>
          <p className="mt-4 text-white/60">
            Des voyageurs vérifiés transportent vos colis entre l&apos;Europe et l&apos;Afrique.
          </p>
        </div>
        <p className="relative text-sm text-white/60">Identités vérifiées · Suivi de chaque colis</p>
      </div>
      <div className="flex flex-col sm:px-10 lg:py-8">
        {/* Mobile et tablette : bandeau photo, comme sur ordinateur */}
        <div className="relative overflow-hidden bg-ink px-4 pt-6 pb-16 text-white sm:-mx-10 sm:px-10 lg:hidden">
          <Image src={aeroport} alt="" fill placeholder="blur" sizes="100vw" priority className="object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/60 to-ink" aria-hidden="true" />
          <Link href="/" aria-label="Accueil" className="relative inline-block">
            <Logo tone="light" />
          </Link>
          <p className="display relative mt-10 max-w-xs text-2xl leading-tight">Vos colis voyagent avec des voyageurs vérifiés.</p>
          <p className="relative mt-2 text-sm text-white/70">Identités vérifiées · Suivi de chaque colis</p>
        </div>
        <div className="relative mx-auto -mt-8 w-full max-w-md rounded-t-3xl bg-paper px-4 pt-8 pb-10 sm:rounded-3xl sm:px-0 lg:mt-0 lg:my-auto lg:bg-transparent lg:py-10">
          <h1 className="display text-3xl sm:text-4xl">{title}</h1>
          <p className="mt-3 text-muted">{intro}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
