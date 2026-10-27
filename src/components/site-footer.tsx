import Link from "next/link";
import { Logo } from "@/components/logo";
import { CORRIDORS, corridorSlug, findPlace } from "@/lib/places";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white/75">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo tone="light" />
          <p className="max-w-xs text-sm leading-relaxed">
            Des voyageurs vérifiés transportent vos colis dans leurs kilos libres, entre l&apos;Europe et l&apos;Afrique.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Envoyer un colis</p>
          <ul className="space-y-2 text-sm">
            {CORRIDORS.slice(0, 6).map(([a, b]) => (
              <li key={a + b}>
                <Link href={`/envoyer-un-colis/${corridorSlug(a, b)}`} className="hover:text-white">
                  {findPlace(a)?.city} → {findPlace(b)?.city}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Send By Me</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/comment-ca-marche" className="hover:text-white">Comment ça marche</Link></li>
            <li><Link href="/securite" className="hover:text-white">Sécurité et confiance</Link></li>
            <li><Link href="/objets-interdits" className="hover:text-white">Objets interdits</Link></li>
            <li><Link href="/publier" className="hover:text-white">Proposer mes kilos</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Légal</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/cgu" className="hover:text-white">Conditions d&apos;utilisation</Link></li>
            <li><Link href="/confidentialite" className="hover:text-white">Confidentialité</Link></li>
            <li><a href="mailto:contact@send-by-me.com" className="hover:text-white">contact@send-by-me.com</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/50 sm:px-6">© {2026} Send By Me</p>
      </div>
    </footer>
  );
}
