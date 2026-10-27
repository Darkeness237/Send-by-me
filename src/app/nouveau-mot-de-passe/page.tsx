import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/account-forms";
import { AuthLayout } from "@/components/auth-layout";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default function NewPasswordPage() {
  return (
    <AuthLayout title="Nouveau mot de passe" intro="Choisissez un mot de passe que vous n'utilisez sur aucun autre site.">
      <NewPasswordForm />
    </AuthLayout>
  );
}
