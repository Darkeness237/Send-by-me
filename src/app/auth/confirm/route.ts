import { type EmailOtpType } from "@supabase/supabase-js";
import { after, NextResponse, type NextRequest } from "next/server";
import { cleanReferralCode } from "@/lib/referral";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendWelcome } from "@/lib/welcome";

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

/**
 * Fin du retour Google / Facebook : petite page qui enchaîne vers la suite au lieu d'une redirection directe.
 * Les cookies de session sont posés sur cette réponse, et la page suivante est une navigation interne au site :
 * certains navigateurs mobiles (Safari) ne les renvoient pas dans une chaîne de redirections partie d'un autre site.
 */
function continueTo(url: string) {
  const safe = JSON.stringify(url).replace(/</g, "\\u003c");
  const attr = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return new NextResponse(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${attr}"><title>Send By Me</title></head><body style="font-family:system-ui,sans-serif;background:#fbf8f1;color:#0e304c;display:grid;place-items:center;min-height:100vh;margin:0"><p>Connexion…</p><script>location.replace(${safe})</script></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

/** N'accepte que des chemins internes, pour éviter les redirections ouvertes. */
function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/espace";
}

/** Premier passage : écran de bienvenue (photo, téléphone, identité) avant d'aller plus loin. */
async function afterLogin(supabase: Awaited<ReturnType<typeof createClient>>, next: string, skip = false) {
  if (skip) return next;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return next;
  const { data: profile } = await supabase.from("profiles").select("onboarded_at").eq("id", data.user.id).maybeSingle();
  if (!profile || profile.onboarded_at) return next;
  // Nouveau membre : e-mail de bienvenue, envoyé après la réponse.
  const userId = data.user.id;
  after(() => sendWelcome(userId));
  return `/bienvenue?suite=${encodeURIComponent(next)}`;
}

// Liens envoyés par e-mail : confirmation d'inscription et réinitialisation du mot de passe.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("suite") ?? (type === "recovery" ? "/nouveau-mot-de-passe" : null));
  const supabase = await createClient();

  // Connexion Google ouverte depuis le site (Google Identity Services) : la session existe déjà.
  if (searchParams.get("session") === "1") {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.redirect(`${origin}/connexion?erreur=google&suite=${encodeURIComponent(next)}`);
    await attachReferral(supabase, searchParams.get("parrain"));
    return NextResponse.redirect(`${origin}${await afterLogin(supabase, next)}`);
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${await afterLogin(supabase, next, type === "recovery")}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await attachReferral(supabase, searchParams.get("parrain"));
      return continueTo(`${origin}${await afterLogin(supabase, next)}`);
    }
    // Retour Google/Facebook ouvert une deuxième fois (double clic, rechargement) : le premier passage
    // a déjà ouvert la session, on continue simplement au lieu d'afficher une erreur.
    const { data } = await supabase.auth.getUser();
    if (data.user) return continueTo(`${origin}${await afterLogin(supabase, next)}`);
    // Sinon, le plus souvent : connexion commencée dans un autre navigateur (appli installée,
    // navigateur intégré d'Instagram ou de Gmail) que celui qui revient de Google.
    console.error("Retour de connexion Google", error.name, error.message);
    return NextResponse.redirect(`${origin}/connexion?erreur=google&suite=${encodeURIComponent(next)}`);
  }
  return NextResponse.redirect(`${origin}/connexion?erreur=lien`);
}
