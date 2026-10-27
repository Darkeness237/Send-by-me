import "server-only";

import webpush from "web-push";
import { isBrevoConfigured, sendEmail } from "@/lib/brevo";
import { SITE_URL } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// Notifications : enregistrées dans l'application, envoyées en push (téléphone, navigateur)
// et par e-mail via Brevo pour les événements importants. Chaque canal est facultatif :
// sans clés VAPID ou Brevo, la notification reste visible dans l'application.

export type Notice = {
  kind: string;
  title: string;
  body?: string;
  href?: string;
  /** Envoyer aussi un e-mail (réservations, paiements, livraisons). Pas pour chaque message. */
  email?: boolean;
};

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const pushReady = Boolean(vapidPublic && vapidPrivate);
if (pushReady) webpush.setVapidDetails("mailto:support@send-by-me.com", vapidPublic!, vapidPrivate!);

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function emailHtml(n: Notice) {
  const link = `${SITE_URL}${n.href ?? "/espace"}`;
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#fbf8f1;font-family:Arial,Helvetica,sans-serif;color:#0e304c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden">
<tr><td align="center" style="background:#fbf8f1;padding:26px 28px 18px;border-bottom:1px solid #e8e1d3"><img src="${SITE_URL}/brand/logo-email.png" width="170" height="145" alt="Send By Me" style="display:block;border:0;width:170px;height:auto"></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 10px;font-size:21px">${escape(n.title)}</h1>
${n.body ? `<p style="margin:0 0 22px;font-size:16px;line-height:1.5;color:#2b4964">${escape(n.body)}</p>` : ""}
<a href="${link}" style="display:inline-block;background:#2f7a82;color:#fff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:999px">Ouvrir Send By Me</a>
</td></tr>
<tr><td style="padding:16px 28px;background:#fbf8f1;font-size:12px;color:#5f6f80">Vous recevez cet e-mail car vous avez un compte Send By Me. Désactivez ces e-mails dans « Mon profil ».</td></tr>
</table></td></tr></table></body></html>`;
}

export async function notify(userId: string, n: Notice) {
  const db = createAdminClient();
  await db.from("notifications").insert({ user_id: userId, kind: n.kind, title: n.title.slice(0, 120), body: n.body?.slice(0, 400) ?? null, href: n.href ?? null });

  const tasks: Promise<unknown>[] = [];
  if (pushReady) {
    tasks.push(
      (async () => {
        const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
        const payload = JSON.stringify({ title: n.title, body: n.body ?? "", url: n.href ?? "/espace", tag: n.kind });
        await Promise.all(
          (subs ?? []).map(async (s) => {
            try {
              await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
            } catch (e) {
              // Abonnement expiré ou révoqué : on l'oublie.
              const code = (e as { statusCode?: number }).statusCode;
              if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
            }
          }),
        );
      })(),
    );
  }
  if (n.email && isBrevoConfigured()) {
    tasks.push(
      (async () => {
        const { data: profile } = await db.from("profiles").select("full_name, email_notifications").eq("id", userId).maybeSingle();
        if (profile && !profile.email_notifications) return;
        const { data } = await db.auth.admin.getUserById(userId);
        if (data.user?.email) await sendEmail({ email: data.user.email, name: profile?.full_name ?? undefined }, n.title, emailHtml(n));
      })(),
    );
  }
  await Promise.allSettled(tasks);
}

/** Envoie sans bloquer ni faire échouer l'action en cours. */
export function notifySafe(userId: string | null | undefined, n: Notice) {
  if (!userId) return Promise.resolve();
  return notify(userId, n).catch((e) => console.error("notification", n.kind, e));
}
