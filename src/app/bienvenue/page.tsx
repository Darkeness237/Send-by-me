import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BadgeCheck, CheckCircle2 } from "lucide-react";
import { finishOnboarding } from "@/app/actions/onboarding";
import { startIdentityCheck } from "@/app/actions/verification";
import { Logo } from "@/components/logo";
import { AvatarUploader, PhoneVerifier } from "@/components/onboarding-forms";
import { PushToggle } from "@/components/push-toggle";
import { Button, ButtonLink } from "@/components/ui/button";
import { getProfile } from "@/lib/data";
import { isStripeConfigured } from "@/lib/stripe";
import { createClient, getUserId } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bienvenue", robots: { index: false } };

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-6 ring-1 ring-line">
      <h2 className="flex items-center gap-3 font-bold">
        {done ? (
          <CheckCircle2 className="h-7 w-7 text-ok" aria-hidden="true" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm text-white">{n}</span>
        )}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

async function Welcome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/bienvenue");
  const [profile, sp] = await Promise.all([getProfile(userId), searchParams]);
  if (!profile) redirect("/espace");
  const supabase = await createClient();
  const { data: contact } = await supabase.from("member_contacts").select("phone, phone_verified_at").eq("user_id", userId).maybeSingle();
  const firstName = (profile.full_name || "").split(" ")[0];

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <Logo />
        <h1 className="display mt-8 text-3xl sm:text-4xl">Bienvenue{firstName ? `, ${firstName}` : ""} !</h1>
        <p className="mt-2 text-muted">Quelques étapes rapides pour inspirer confiance aux autres membres. Vous pouvez les faire plus tard.</p>

        <div className="mt-6 space-y-4">
          <Step n={1} title="Votre photo" done={!!profile.avatar_url}>
            <AvatarUploader userId={userId} current={profile.avatar_url} name={profile.full_name || "vous"} />
          </Step>
          <Step n={2} title="Votre numéro de téléphone" done={!!contact?.phone_verified_at}>
            <p className="mb-4 text-sm text-muted">Il n&apos;est jamais affiché. Il sert à vous joindre pour une livraison et sécurise votre compte.</p>
            <PhoneVerifier verifiedPhone={contact?.phone_verified_at ? (contact.phone as string) : null} />
          </Step>
          <Step n={3} title="Votre pièce d'identité" done={profile.id_verified}>
            {profile.id_verified ? (
              <p className="flex items-center gap-2 font-semibold text-ok">
                <BadgeCheck className="h-5 w-5" aria-hidden="true" /> Identité vérifiée
              </p>
            ) : isStripeConfigured ? (
              <>
                <p className="mb-4 text-sm text-muted">
                  Une photo de votre pièce, un selfie, et c&apos;est fait en deux minutes.
                </p>
                <form action={startIdentityCheck}>
                  <Button type="submit">
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Vérifier mon identité
                  </Button>
                </form>
              </>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted">Faites vérifier votre pièce d&apos;identité pour obtenir le badge bleu.</p>
                <ButtonLink href="/espace/profil" variant="outline">
                  Vérifier mon identité
                </ButtonLink>
              </>
            )}
          </Step>
          <Step n={4} title="Les notifications">
            <p className="mb-4 text-sm text-muted">Soyez prévenu dès qu&apos;un voyageur répond, qu&apos;un paiement arrive ou que votre colis avance.</p>
            <PushToggle />
          </Step>
        </div>

        <form action={finishOnboarding} className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <input type="hidden" name="suite" value={sp.suite ?? ""} />
          <Button type="submit" size="lg">
            Accéder à Send By Me
          </Button>
          <p className="text-sm text-muted">Vous retrouverez ces étapes dans « Mon profil ».</p>
        </form>
      </div>
    </div>
  );
}

export default function WelcomePage(props: PageProps<"/bienvenue">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <Welcome searchParams={props.searchParams as Promise<Record<string, string | undefined>>} />
    </Suspense>
  );
}
