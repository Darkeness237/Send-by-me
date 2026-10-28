import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/account-forms";
import { AuthLayout } from "@/components/auth-layout";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Nouveau mot de passe"), robots: { index: false } };
}

export default async function NewPasswordPage() {
  const t = await getT();
  return (
    <AuthLayout title={t("Nouveau mot de passe")} intro={t("Choisissez un mot de passe que vous n'utilisez sur aucun autre site.")}>
      <NewPasswordForm />
    </AuthLayout>
  );
}
