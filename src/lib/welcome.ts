import "server-only";

import { notifySafe } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

/** E-mail de bienvenue, une seule fois par membre (inscription par e-mail ou Google). */
export async function sendWelcome(userId: string) {
  const db = createAdminClient();
  const [{ count }, { data: profile }] = await Promise.all([
    db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "welcome"),
    db.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
  ]);
  if (count) return;
  const firstName = (profile?.full_name ?? "").split(" ")[0];
  await notifySafe(userId, {
    kind: "welcome",
    title: firstName ? `Bienvenue sur Send By Me, ${firstName} !` : "Bienvenue sur Send By Me !",
    body: "Envoyez un colis avec un voyageur vérifié, ou rentabilisez les kilos libres de votre valise. Commencez par compléter votre profil : photo, téléphone et identité.",
    href: "/bienvenue",
    email: true,
  });
}
