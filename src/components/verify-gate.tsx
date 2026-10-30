import { BadgeCheck, CheckCircle2, Circle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import type { Verification } from "@/lib/verification-gate";
import { getT } from "@/i18n/server";

/** Affiché à la place du formulaire tant que l'e-mail ou l'identité ne sont pas vérifiés. */
export async function VerifyGate({ status, action }: { status: Verification; action: "publish" | "book" }) {
  const t = await getT();
  const steps: [boolean, string][] = [
    [status.email, t("Adresse e-mail confirmée")],
    [status.identity, t("Identité vérifiée (pièce + selfie, 2 minutes)")],
  ];
  return (
    <section className="rounded-3xl bg-card p-6 ring-1 ring-line sm:p-8" aria-labelledby="verify-gate">
      <h2 id="verify-gate" className="text-xl font-bold">
        {action === "publish" ? t("Avant de publier, vérifiez votre profil") : t("Avant de réserver, vérifiez votre profil")}
      </h2>
      <p className="mt-2 text-ink-soft">
        {t("Pour la sécurité de tous, chaque voyageur et chaque expéditeur a confirmé son e-mail et fait vérifier son identité.")}
      </p>
      <ul className="mt-4 space-y-2.5">
        {steps.map(([done, label]) => (
          <li key={label} className={`flex items-center gap-3 ${done ? "text-ok" : "font-semibold"}`}>
            {done ? <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" /> : <Circle className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />}
            <span>{label}</span>
            <span className="sr-only">{done ? t("Fait") : t("À faire")}</span>
          </li>
        ))}
      </ul>
      <ButtonLink href={status.email ? "/espace/profil#verifie" : "/connexion?erreur=lien"} className="mt-6">
        <BadgeCheck className="h-4 w-4" aria-hidden="true" /> {status.email ? t("Vérifier mon identité") : t("Recevoir un nouveau lien de confirmation")}
      </ButtonLink>
    </section>
  );
}
