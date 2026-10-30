import "server-only";

import webpush from "web-push";
import { isBrevoConfigured, sendEmail } from "@/lib/brevo";
import { SITE_URL } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWhatsAppConfigured, sendWhatsApp } from "@/lib/whatsapp";

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

// Clés collées à la main : on retire espaces, guillemets et « = » finaux avant de les utiliser.
const cleanKey = (k?: string) => k?.trim().replace(/^["']|["']$/g, "").replace(/=+$/, "").trim();
const vapidPublic = cleanKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
const vapidPrivate = cleanKey(process.env.VAPID_PRIVATE_KEY);
let pushReady = Boolean(vapidPublic && vapidPrivate);
if (pushReady) {
  try {
    webpush.setVapidDetails("mailto:support@send-by-me.com", vapidPublic!, vapidPrivate!);
  } catch (e) {
    // Clé mal formée : les notifications push sont coupées, le reste du site continue.
    pushReady = false;
    console.error("Clés VAPID invalides", (e as Error).message);
  }
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Adresse affichée en texte (sans lien) : Brevo ne la réécrit pas et la messagerie la rend cliquable
// directement, ce qui évite la redirection de suivi des clics de Brevo si elle est en panne.
export const plain = (url: string) => escape(url.replace(/^https?:\/\//, ""));

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
<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#5f6f80">Le bouton ne s'ouvre pas ? Copiez cette adresse dans votre navigateur :<br><span style="color:#2f7a82;word-break:break-all">${plain(link)}</span></p>
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
  // WhatsApp : mêmes événements importants que l'e-mail, seulement si le membre l'a activé et vérifié son numéro.
  if (n.email && isWhatsAppConfigured()) {
    tasks.push(
      (async () => {
        const [{ data: profile }, { data: contact }] = await Promise.all([
          db.from("profiles").select("whatsapp_notifications").eq("id", userId).maybeSingle(),
          db.from("member_contacts").select("phone, phone_verified_at").eq("user_id", userId).maybeSingle(),
        ]);
        if (profile?.whatsapp_notifications && contact?.phone && contact.phone_verified_at) {
          await sendWhatsApp(contact.phone, n.title, n.body ?? "", n.href ?? "/espace");
        }
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
