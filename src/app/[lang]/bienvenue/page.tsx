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
import { getT } from "@/i18n/server";
import { TrackEvent } from "@/components/track-event";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Bienvenue"), robots: { index: false } };
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-card p-6 ring-1 ring-line">
      <h2 className="flex items-center gap-3 font-bold">
        {done ? (
          <CheckCircle2 className="h-7 w-7 text-ok" aria-hidden="true" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-night text-sm text-white">{n}</span>
        )}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Page rendue à chaque visite : l'heure courante fait partie de la requête.
const nowMs = () => new Date().getTime();

async function Welcome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getT();
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/bienvenue");
  const [profile, sp] = await Promise.all([getProfile(userId), searchParams]);
  if (!profile) redirect("/espace");
  const supabase = await createClient();
  const [{ data: contact }, { data: auth }] = await Promise.all([
    supabase.from("member_contacts").select("phone, phone_verified_at").eq("user_id", userId).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  // Inscription par Google ou Facebook : comptée à la première arrivée ici (l'inscription par e-mail l'est à l'envoi du formulaire).
  const provider = auth.user?.app_metadata?.provider as string | undefined;
  const newSocialSignup = (provider === "google" || provider === "facebook") && nowMs() - new Date(auth.user!.created_at).getTime() < 15 * 60_000;
  const firstName = (profile.full_name || "").split(" ")[0];

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <Logo />
        {newSocialSignup && <TrackEvent name="Inscription" props={{ methode: provider as "google" | "facebook" }} />}
        <h1 className="display mt-8 text-3xl sm:text-4xl">{firstName ? t("Bienvenue, {firstName} !", { firstName }) : t("Bienvenue !")}</h1>
        <p className="mt-2 text-muted">{t("Quelques étapes rapides pour inspirer confiance aux autres membres. Vous pouvez les faire plus tard.")}</p>

        <div className="mt-6 space-y-4">
          <Step n={1} title={t("Votre photo")} done={!!profile.avatar_url}>
            <AvatarUploader userId={userId} current={profile.avatar_url} name={profile.full_name || t("vous")} />
          </Step>
          <Step n={2} title={t("Votre numéro de téléphone")} done={!!contact?.phone_verified_at}>
            <p className="mb-4 text-sm text-muted">{t("Il n'est jamais affiché. Il sert à vous joindre pour une livraison et sécurise votre compte.")}</p>
            <PhoneVerifier verifiedPhone={contact?.phone_verified_at ? (contact.phone as string) : null} />
          </Step>
          <Step n={3} title={t("Votre pièce d'identité")} done={profile.id_verified}>
            {profile.id_verified ? (
              <p className="flex items-center gap-2 font-semibold text-ok">
                <BadgeCheck className="h-5 w-5" aria-hidden="true" />{" "}{t("Identité vérifiée")}
              </p>
            ) : isStripeConfigured ? (
              <>
                <p className="mb-4 text-sm text-muted">
                  {t("Une photo de votre pièce, un selfie, et c'est fait en deux minutes.")}
                </p>
                <form action={startIdentityCheck}>
                  <Button type="submit">
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />{" "}{t("Vérifier mon identité")}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted">{t("Faites vérifier votre pièce d'identité pour obtenir le badge bleu.")}</p>
                <ButtonLink href="/espace/profil" variant="outline">
                  {t("Vérifier mon identité")}
                </ButtonLink>
              </>
            )}
          </Step>
          <Step n={4} title={t("Les notifications")}>
            <p className="mb-4 text-sm text-muted">{t("Soyez prévenu dès qu'un voyageur répond, qu'un paiement arrive ou que votre colis avance.")}</p>
            <PushToggle />
          </Step>
        </div>

        <form action={finishOnboarding} className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <input type="hidden" name="suite" value={sp.suite ?? ""} />
          <Button type="submit" size="lg">
            {t("Accéder à Send By Me")}
          </Button>
          <p className="text-sm text-muted">{t("Vous retrouverez ces étapes dans « Mon profil ».")}</p>
        </form>
      </div>
    </div>
  );
}

export default function WelcomePage(props: PageProps<"/[lang]/bienvenue">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <Welcome searchParams={props.searchParams as Promise<Record<string, string | undefined>>} />
    </Suspense>
  );
}
