import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/account-forms";
import { AuthLayout } from "@/components/auth-layout";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Mot de passe oublié"), robots: { index: false } };
}

export default async function ForgotPasswordPage() {
  const t = await getT();
  return (
    <AuthLayout title={t("Mot de passe oublié")} intro={t("Indiquez l'e-mail de votre compte : nous vous envoyons un lien pour en choisir un nouveau.")}>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
