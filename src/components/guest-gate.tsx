import Link from "next/link";
import { CheckCircle2, Search, UserPlus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getT } from "@/i18n/server";

/**
 * À la place d'une redirection brutale vers la connexion : on explique pourquoi un compte est demandé
 * et ce qu'on peut faire sans compte.
 */
export async function GuestGate({ next, title, reasons }: { next: string; title: string; reasons: string[] }) {
  const t = await getT();
  const suite = encodeURIComponent(next);
  return (
    <section className="grid gap-6 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8 md:grid-cols-[1.2fr_1fr]">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-ink-soft">{t("Un compte gratuit est demandé à cette étape, pour que chacun sache à qui il a affaire.")}</p>
        <ul className="mt-5 space-y-2.5">
          {reasons.map((r) => (
            <li key={r} className="flex items-start gap-3 text-[15px]">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden="true" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={`/inscription?suite=${suite}`} size="lg">
            <UserPlus className="h-5 w-5" aria-hidden="true" /> {t("Créer mon compte gratuit")}
          </ButtonLink>
          <ButtonLink href={`/connexion?suite=${suite}`} size="lg" variant="outline">
            {t("J'ai déjà un compte")}
          </ButtonLink>
        </div>
        <p className="mt-3 text-sm text-muted">{t("Inscription en une minute, avec Google ou votre e-mail.")}</p>
      </div>
      <div className="rounded-2xl bg-paper p-5">
        <p className="font-bold">{t("Sans compte, vous pouvez déjà :")}</p>
        <ul className="mt-3 space-y-3 text-[15px]">
          <li>
            <Link href="/recherche" className="flex items-center gap-2 font-semibold text-brand">
              <Search className="h-4 w-4" aria-hidden="true" /> {t("Chercher un trajet et voir les prix")}
            </Link>
          </li>
          <li>
            <Link href="/#prix" className="flex items-center gap-2 font-semibold text-brand">
              <Search className="h-4 w-4" aria-hidden="true" /> {t("Simuler le prix de votre envoi")}
            </Link>
          </li>
          <li>
            <Link href="/demandes" className="flex items-center gap-2 font-semibold text-brand">
              <Search className="h-4 w-4" aria-hidden="true" /> {t("Voir les demandes d'envoi en cours")}
            </Link>
          </li>
          <li>
            <Link href="/comment-ca-marche" className="flex items-center gap-2 font-semibold text-brand">
              <Search className="h-4 w-4" aria-hidden="true" /> {t("Comprendre comment ça marche")}
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
