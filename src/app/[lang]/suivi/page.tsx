import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PackageSearch } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Suivre un colis"),
    description: t("Suivez votre colis Send By Me en temps réel avec son numéro de suivi."),
  };
}

async function track(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/^SBM-?/, "");
  redirect(`/suivi/SBM-${code}`);
}

export default async function TrackPage() {
  const t = await getT();
  return (
    <PageShell>
      <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
        <PackageSearch className="h-10 w-10 text-brand" aria-hidden="true" />
        <h1 className="display mt-4 text-3xl sm:text-4xl">{t("Suivre un colis")}</h1>
        <p className="mt-2 text-muted">{t("Saisissez le numéro de suivi transmis par l'expéditeur, par exemple SBM-4K7Q2MZP.")}</p>
        <form action={track} className="mt-6 flex gap-2">
          <label htmlFor="code" className="sr-only">
            {t("Numéro de suivi")}
          </label>
          <Input id="code" name="code" required placeholder={t("SBM-XXXXXXXX")} autoComplete="off" className="wide flex-1 uppercase tracking-wider" />
          <Button type="submit">{t("Suivre")}</Button>
        </form>
      </div>
    </PageShell>
  );
}
