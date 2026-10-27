import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck } from "lucide-react";
import { ProfileForm } from "@/components/account-forms";
import { IdentityVerificationForm } from "@/components/verification-forms";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/page-shell";
import { getProfile } from "@/lib/data";
import { getUserId } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mon profil", robots: { index: false } };

async function Profile() {
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil");
  const profile = await getProfile(userId);
  if (!profile) redirect("/espace");
  const supabase = await createClient();
  const { data: lastRequest } = await supabase
    .from("identity_verifications")
    .select("status, rejection_reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/espace" className="text-sm font-semibold text-brand">
        ← Mon espace
      </Link>
      <h1 className="display mt-4 text-3xl sm:text-4xl">Mon profil</h1>
      <p className="mt-2 text-muted">Ces informations sont visibles par les autres membres.</p>

      <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-line">
        {profile.id_verified ? (
          <p className="flex items-center gap-2 font-semibold text-brand-deep">
            <BadgeCheck className="h-5 w-5" aria-hidden="true" /> Identité vérifiée
          </p>
        ) : lastRequest?.status === "pending" ? (
          <>
            <p className="font-semibold">Vérification en cours</p>
            <p className="mt-1 text-sm text-muted">Notre équipe examine vos documents, en général sous 24 heures. Le badge apparaîtra ici.</p>
          </>
        ) : (
          <>
            <p className="font-semibold">Faites vérifier votre identité</p>
            <p className="mt-1 mb-4 text-sm text-muted">
              Le badge bleu rassure les autres membres : les voyageurs et expéditeurs vérifiés reçoivent plus de demandes.
            </p>
            {lastRequest?.status === "rejected" && (
              <p role="alert" className="mb-4 rounded-xl bg-danger-pale px-4 py-3 text-sm text-danger">
                Votre dernière demande a été refusée : {lastRequest.rejection_reason}. Vous pouvez en envoyer une nouvelle.
              </p>
            )}
            <IdentityVerificationForm userId={userId} />
          </>
        )}
      </div>

      <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-2xl" />}>
        <Profile />
      </Suspense>
    </PageShell>
  );
}
