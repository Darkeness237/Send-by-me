import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { OrDivider, SocialButtons } from "@/components/google-button";
import { Gift } from "lucide-react";
import { SignUpForm } from "@/components/auth-forms";
import { getReferrer } from "@/lib/data";
import { euros } from "@/lib/pricing";
import { cleanReferralCode, REFERRAL_REWARD_CENTS } from "@/lib/referral";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Inscrivez-vous gratuitement pour envoyer un colis ou proposer vos kilos libres.",
};

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const code = cleanReferralCode(sp.parrain);
  const referrer = code ? await getReferrer(code) : null;
  const referral = referrer ? code! : undefined;
  return (
    <>
      {referrer && (
        <p role="status" className="mb-5 flex items-center gap-3 rounded-2xl bg-signal/25 px-4 py-3 text-[15px]">
          <Gift className="h-6 w-6 shrink-0 text-ink" aria-hidden="true" />
          <span>
            <span className="font-semibold">{referrer.full_name || "Un membre"} vous invite.</span> Inscrivez-vous et recevez{" "}
            {euros(REFERRAL_REWARD_CENTS)} de réduction sur les frais de votre premier envoi.
          </span>
        </p>
      )}
      <SocialButtons next={sp.suite} referral={referral} />
      <OrDivider />
      <SignUpForm next={sp.suite} referral={referral} />
    </>
  );
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
