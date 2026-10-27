import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck } from "lucide-react";
import { ProfileForm } from "@/components/account-forms";
import { PageShell } from "@/components/page-shell";
import { getProfile } from "@/lib/data";
import { getUserId } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mon profil", robots: { index: false } };

async function Profile() {
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil");
  const profile = await getProfile(userId);
  if (!profile) redirect("/espace");

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
        ) : (
          <>
            <p className="font-semibold">Identité non vérifiée</p>
            <p className="mt-1 text-sm text-muted">
              Les membres vérifiés reçoivent plus de demandes. Envoyez une photo de votre pièce d&apos;identité à{" "}
              <a href="mailto:verification@sendbyme.app" className="font-semibold text-brand">
                verification@sendbyme.app
              </a>{" "}
              depuis l&apos;adresse de votre compte. Elle est supprimée après contrôle.
            </p>
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
