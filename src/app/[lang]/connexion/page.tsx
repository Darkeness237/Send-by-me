import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { OrDivider, SocialButtons } from "@/components/google-button";
import { SignInForm } from "@/components/auth-forms";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Connexion"), robots: { index: false } };
}

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getT();
  const sp = await searchParams;
  return (
    <>
      {sp.inscrit === "1" && (
        <p role="status" className="mb-5 rounded-xl bg-ok-pale px-4 py-3 text-sm text-ok">
          {t("Compte créé ! Ouvrez le lien de confirmation reçu par e-mail, puis connectez-vous ici.")}
        </p>
      )}
      {(sp.erreur === "google" || sp.erreur === "facebook") && (
        <p className="mb-5 rounded-xl bg-danger-pale px-4 py-3 text-sm text-danger">
          {t("La connexion avec {v} n'a pas abouti. Réessayez ou utilisez votre e-mail.", { v: sp.erreur === "google" ? "Google" : "Facebook" })}
        </p>
      )}
      {sp.erreur === "lien" && (
        <p className="mb-5 rounded-xl bg-danger-pale px-4 py-3 text-sm text-danger">{t("Ce lien a expiré. Connectez-vous ou demandez-en un nouveau.")}</p>
      )}
      <SocialButtons next={sp.suite} />
      <OrDivider />
      <SignInForm next={sp.suite} />
    </>
  );
}

export default async function LoginPage(props: PageProps<"/[lang]/connexion">) {
  const t = await getT();
  return (
    <AuthLayout title={t("Bon retour")} intro={t("Connectez-vous pour suivre vos envois et vos trajets.")}>
      <Suspense>
        <Form searchParams={props.searchParams as Promise<Record<string, string | undefined>>} />
      </Suspense>
    </AuthLayout>
  );
}
