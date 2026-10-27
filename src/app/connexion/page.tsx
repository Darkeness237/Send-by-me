import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { GoogleButton, OrDivider } from "@/components/google-button";
import { SignInForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      {sp.inscrit === "1" && (
        <p role="status" className="mb-5 rounded-xl bg-ok-pale px-4 py-3 text-sm text-ok">
          Compte créé ! Ouvrez le lien de confirmation reçu par e-mail, puis connectez-vous ici.
        </p>
      )}
      {sp.erreur === "google" && (
        <p className="mb-5 rounded-xl bg-danger-pale px-4 py-3 text-sm text-danger">La connexion avec Google n&apos;a pas abouti. Réessayez ou utilisez votre e-mail.</p>
      )}
      {sp.erreur === "lien" && (
        <p className="mb-5 rounded-xl bg-danger-pale px-4 py-3 text-sm text-danger">Ce lien a expiré. Connectez-vous ou demandez-en un nouveau.</p>
      )}
      <GoogleButton next={sp.suite} />
      <OrDivider />
      <SignInForm next={sp.suite} />
    </>
  );
}

export default function LoginPage(props: PageProps<"/connexion">) {
  return (
    <AuthLayout title="Bon retour" intro="Connectez-vous pour suivre vos envois et vos trajets.">
      <Suspense>
        <Form searchParams={props.searchParams as Promise<Record<string, string | undefined>>} />
      </Suspense>
    </AuthLayout>
  );
}
