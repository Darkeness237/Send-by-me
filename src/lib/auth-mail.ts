import "server-only";

import { isBrevoConfigured, sendEmail } from "@/lib/brevo";
import { SITE_URL } from "@/lib/env";
import { plain } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

// E-mails d'inscription envoyés par Send By Me (Brevo) plutôt que par Supabase :
// expéditeur et lien sur send-by-me.com, et lien valable dans n'importe quel navigateur
// (jeton haché vérifié par /auth/confirm, sans dépendre du navigateur qui a servi à l'inscription).

export const canSendAuthMail = isBrevoConfigured;

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function confirmHtml(firstName: string, link: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#fbf8f1;font-family:Arial,Helvetica,sans-serif;color:#0e304c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden">
<tr><td align="center" style="background:#fbf8f1;padding:26px 28px 18px;border-bottom:1px solid #e8e1d3"><img src="${SITE_URL}/brand/logo-email.png" width="170" height="145" alt="Send By Me" style="display:block;border:0;width:170px;height:auto"></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 10px;font-size:21px">Bienvenue${firstName ? ` ${escape(firstName)}` : ""} !</h1>
<p style="margin:0 0 22px;font-size:16px;line-height:1.5;color:#2b4964">Confirmez votre adresse e-mail pour activer votre compte Send By Me.</p>
<a href="${link}" style="display:inline-block;background:#2f7a82;color:#fff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px">Confirmer mon adresse</a>
<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#5f6f80">Le bouton ne s'ouvre pas ? Copiez cette adresse dans votre navigateur :<br><span style="color:#2f7a82;word-break:break-all">${plain(link)}</span></p>
<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#5f6f80">Ce lien est valable 24 heures. Vous n'avez pas créé de compte ? Ignorez simplement cet e-mail.</p>
</td></tr>
<tr><td style="padding:16px 28px;background:#fbf8f1;font-size:12px;color:#5f6f80">Send By Me · send-by-me.com</td></tr>
</table></td></tr></table></body></html>`;
}

const confirmLink = (tokenHash: string, type: "signup" | "magiclink", next: string) =>
  `${SITE_URL}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${type}&suite=${encodeURIComponent(next)}`;

export type SignupResult = "sent" | "exists" | "failed";

/** Crée le compte (non confirmé) et envoie le lien de confirmation. */
export async function signUpWithOwnMail(input: { email: string; password: string; firstName: string; data: Record<string, unknown>; next: string }): Promise<SignupResult> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "signup",
    email: input.email,
    password: input.password,
    options: { data: input.data, redirectTo: `${SITE_URL}/auth/confirm` },
  });
  if (error) {
    if (error.code === "email_exists" || /already been registered|already registered/i.test(error.message)) return "exists";
    console.error("Inscription", error.code, error.message);
    return "failed";
  }
  const sent = await sendEmail({ email: input.email, name: input.firstName }, "Confirmez votre adresse e-mail · Send By Me", confirmHtml(input.firstName, confirmLink(data.properties.hashed_token, "signup", input.next)));
  return sent ? "sent" : "failed";
}

/** Renvoie un lien (connexion + confirmation de l'adresse) à un compte existant. Silencieux si l'adresse est inconnue. */
export async function resendWithOwnMail(email: string, next = "/espace") {
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${SITE_URL}/auth/confirm` } });
  if (error || !data.user) return false;
  if (data.user.email_confirmed_at) return true; // déjà confirmé : rien à envoyer
  const firstName = String((data.user.user_metadata?.full_name as string | undefined) ?? "").split(" ")[0];
  return sendEmail({ email, name: firstName }, "Confirmez votre adresse e-mail · Send By Me", confirmHtml(firstName, confirmLink(data.properties.hashed_token, "magiclink", next)));
}
