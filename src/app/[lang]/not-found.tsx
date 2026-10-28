import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <PageShell>
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="wide tabular text-5xl font-extrabold text-signal-deep">404</p>
        <h1 className="display mt-4 text-3xl">{t("Cette page n'a pas embarqué")}</h1>
        <p className="mt-3 text-muted">{t("Le lien est peut-être ancien, ou le trajet a été retiré par son voyageur.")}</p>
        <ButtonLink href="/recherche" className="mt-8">
          {t("Voir les trajets")}
        </ButtonLink>
      </div>
    </PageShell>
  );
}
