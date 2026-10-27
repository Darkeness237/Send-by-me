import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/account-forms";
import { AuthLayout } from "@/components/auth-layout";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Mot de passe oublié" intro="Indiquez l'e-mail de votre compte : nous vous envoyons un lien pour en choisir un nouveau.">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
