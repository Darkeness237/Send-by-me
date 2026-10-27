import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { cleanReferralCode } from "@/lib/referral";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Connexion Google / Facebook d'un nouveau membre arrivé par un lien de parrainage. */
async function attachReferral(supabase: Awaited<ReturnType<typeof createClient>>, rawCode: string | null) {
  const code = cleanReferralCode(rawCode);
  if (!code) return;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  // Seulement pour un compte qui vient d'être créé : un membre existant ne peut pas se rattacher après coup.
  if (!user || Date.now() - new Date(user.created_at).getTime() > 15 * 60_000) return;
  await createAdminClient().rpc("attach_referral", { p_referee: user.id, p_code: code });
}

/** N'accepte que des chemins internes, pour éviter les redirections ouvertes. */
function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/espace";
}

// Liens envoyés par e-mail : confirmation d'inscription et réinitialisation du mot de passe.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("suite") ?? (type === "recovery" ? "/nouveau-mot-de-passe" : null));
  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await attachReferral(supabase, searchParams.get("parrain"));
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/connexion?erreur=lien`);
}
