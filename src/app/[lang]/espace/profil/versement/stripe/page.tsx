import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getUserId } from "@/lib/supabase/server";
import { getConnectAccount, onboardingUrl } from "@/lib/stripe-connect";

// Lien Stripe expiré ou rechargé : on en crée un nouveau et on y renvoie le voyageur.
async function Refresh(): Promise<null> {
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil/versement");
  const acc = await getConnectAccount(userId);
  if (!acc) redirect("/espace/profil/versement");
  let url = "/espace/profil/versement?stripe=erreur";
  try {
    url = await onboardingUrl(acc.account_id);
  } catch {}
  redirect(url);
}

export default function StripeOnboardingRefresh() {
  return (
    <Suspense fallback={null}>
      <Refresh />
    </Suspense>
  );
}
