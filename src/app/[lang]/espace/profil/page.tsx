import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BadgeCheck, CheckCircle2, Circle, Clock, ShieldCheck } from "lucide-react";
import { startIdentityCheck } from "@/app/actions/verification";
import { ProfileForm } from "@/components/account-forms";
import { AvatarUploader, PhoneVerifier } from "@/components/onboarding-forms";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { AddressVerificationForm, IdentityVerificationForm } from "@/components/verification-forms";
import { getProfile } from "@/lib/data";
import { isStripeConfigured } from "@/lib/stripe";
import { createClient, getUserId } from "@/lib/supabase/server";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Mon profil"), robots: { index: false } };
}

type Request = { status: "pending" | "approved" | "rejected"; rejection_reason: string | null } | undefined;

async function Step({ done, pending, title, children }: { done: boolean; pending?: boolean; title: string; children?: ReactNode }) {
  const t = await getT();
  const Icon = done ? CheckCircle2 : pending ? Clock : Circle;
  return (
    <li className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <p className="flex items-center gap-2 font-semibold">
        <Icon className={`h-5 w-5 ${done ? "text-ok" : pending ? "text-signal-deep" : "text-muted"}`} aria-hidden="true" />
        {title}
        {done && <span className="ml-auto text-sm font-medium text-ok">{t("Vérifié")}</span>}
        {pending && !done && <span className="ml-auto text-sm font-medium text-muted">{t("En cours d'examen")}</span>}
      </p>
      {!done && children && <div className="mt-4">{children}</div>}
    </li>
  );
}

async function Rejected({ request }: { request: Request }) {
  const t = await getT();
  if (request?.status !== "rejected") return null;
  return (
    <p role="alert" className="mb-4 rounded-xl bg-danger-pale px-4 py-3 text-sm text-danger">
      {t("Votre dernière demande a été refusée : {rejection_reason}. Vous pouvez en envoyer une nouvelle.", { rejection_reason: request.rejection_reason ?? "" })}
    </p>
  );
}

async function Profile({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getT();
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil");
  const [profile, sp] = await Promise.all([getProfile(userId), searchParams]);
  if (!profile) redirect("/espace");
  const supabase = await createClient();
  const [{ data: requests }, { data: contact }] = await Promise.all([
    supabase
      .from("identity_verifications")
      .select("kind, status, rejection_reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("member_contacts").select("phone, phone_verified_at, address_line, postal_code, address_city, country").eq("user_id", userId).maybeSingle(),
  ]);
  const last = (kind: string) => (requests ?? []).find((r) => r.kind === kind) as Request;
  const idReq = last("identity");
  const addrReq = last("address");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/espace" className="text-sm font-semibold text-brand">
        {t("← Mon espace")}
      </Link>
      <h1 className="display mt-4 text-3xl sm:text-4xl">{t("Mon profil")}</h1>

      <section className="mt-6 space-y-5 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
        <AvatarUploader userId={userId} current={profile.avatar_url} name={profile.full_name || t("vous")} />
        <div className="border-t border-line pt-5">
          <h2 className="mb-3 font-bold">{t("Téléphone")}</h2>
          <PhoneVerifier verifiedPhone={contact?.phone_verified_at ? (contact.phone as string) : null} />
        </div>
      </section>

      <section className="mt-6" aria-labelledby="certif">
        {profile.certified ? (
          <div className="flex items-center gap-4 rounded-3xl bg-ink p-6 text-white">
            <ShieldCheck className="h-12 w-12 shrink-0 rounded-full bg-signal p-2 text-ink" aria-hidden="true" />
            <div>
              <h2 id="certif" className="text-lg font-bold">
                {t("Compte certifié")}
              </h2>
              <p className="text-white/75">{t("Identité et adresse vérifiées. Le badge doré est affiché sur votre profil et vos trajets.")}</p>
            </div>
          </div>
        ) : (
          <>
            <h2 id="certif" className="text-xl font-bold">
              {t("Faites certifier votre compte")}
            </h2>
            <p className="mt-1 text-muted">
              {t("Votre identité vous donne le badge bleu, votre adresse le badge doré. Les membres certifiés reçoivent plus de demandes. Vos documents restent privés et sont effacés après contrôle.")}
            </p>
          </>
        )}

        <ol className="mt-4 space-y-3">
          <Step done title={t("E-mail confirmé")} />
          <Step done={profile.id_verified} pending={idReq?.status === "pending"} title={t("Identité")}>
            {idReq?.status === "pending" ? (
              <p className="text-sm text-muted">{t("Notre équipe examine vos documents, en général sous 24 heures.")}</p>
            ) : (
              <>
                <Rejected request={idReq} />
                {isStripeConfigured ? (
                  <>
                    <div className="rounded-2xl bg-brand-pale/50 p-4">
                      <p className="font-semibold">{t("Vérification en 2 minutes")}</p>
                      <p className="mt-1 mb-3 text-sm text-ink-soft">{t("Une photo de votre pièce, un selfie, et c'est fait. Le résultat arrive tout seul.")}</p>
                      {sp.kyc === "retour" && (
                        <p role="status" className="mb-3 text-sm font-medium text-ok">
                          {t("Merci ! Le résultat s'affichera ici dans quelques instants.")}
                        </p>
                      )}
                      <form action={startIdentityCheck}>
                        <Button type="submit" size="sm">
                          <BadgeCheck className="h-4 w-4" aria-hidden="true" />{" "}{t("Vérifier mon identité")}
                        </Button>
                      </form>
                    </div>
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-muted hover:text-ink">{t("Ça ne marche pas ? Envoyez vos documents")}</summary>
                      <div className="mt-3">
                        <IdentityVerificationForm userId={userId} />
                      </div>
                    </details>
                  </>
                ) : (
                  <IdentityVerificationForm userId={userId} />
                )}
              </>
            )}
          </Step>
          <Step done={!!profile.address_verified} pending={addrReq?.status === "pending"} title={t("Adresse et téléphone")}>
            {addrReq?.status === "pending" ? (
              <p className="text-sm text-muted">{t("Votre justificatif de domicile est en cours d'examen.")}</p>
            ) : (
              <>
                <Rejected request={addrReq} />
                <AddressVerificationForm userId={userId} contact={contact} />
              </>
            )}
          </Step>
        </ol>
      </section>

      <div className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
        <h2 className="mb-1 text-lg font-bold">{t("Profil public")}</h2>
        <p className="mb-5 text-sm text-muted">{t("Ces informations sont visibles par les autres membres.")}</p>
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}

export default function ProfilePage(props: PageProps<"/[lang]/espace/profil">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-2xl" />}>
        <Profile searchParams={props.searchParams as Promise<Record<string, string | undefined>>} />
      </Suspense>
    </PageShell>
  );
}
