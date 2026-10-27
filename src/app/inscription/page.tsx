import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { SignUpForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Inscrivez-vous gratuitement pour envoyer un colis ou proposer vos kilos libres.",
};

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return <SignUpForm next={sp.suite} />;
}

export default function SignUpPage(props: PageProps<"/inscription">) {
  return (
    <AuthLayout title="Créer un compte" intro="Gratuit. Le même compte sert pour envoyer des colis et proposer vos kilos.">
      <Suspense>
        <Form searchParams={props.searchParams as Promise<Record<string, string | undefined>>} />
      </Suspense>
    </AuthLayout>
  );
}
