import "server-only";

import { sendEmail } from "@/lib/brevo";
import { SITE_URL } from "@/lib/env";
import { plain } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Envoie au destinataire son code de réception, une fois le paiement confirmé.
 * Il le donnera au voyageur en recevant le colis : c'est ce geste qui libère le paiement.
 */
export async function sendRecipientCode(bookingId: string) {
  const db = createAdminClient();
  const { data: b } = await db
    .from("bookings")
    .select("id, recipient_name, recipient_email, recipient_notified_at, tracking_code, weight_kg, sender:profiles!bookings_sender_id_fkey(full_name), trip:trips(from_city, to_city, departure_at, transport_ref)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b?.recipient_email || b.recipient_notified_at) return false;
  const { data: secret } = await db.from("booking_secrets").select("delivery_code").eq("booking_id", bookingId).maybeSingle();
  if (!secret) return false;

  const trip = Array.isArray(b.trip) ? b.trip[0] : b.trip;
  const sender = Array.isArray(b.sender) ? b.sender[0] : b.sender;
  const from = (sender?.full_name as string | undefined)?.split(" ")[0] || "Un proche";
  const track = `${SITE_URL}/suivi/${b.tracking_code}`;
  const code = String(secret.delivery_code).replace(/(\d{3})(\d{3})/, "$1 $2");
  const route = trip ? `${trip.from_city} → ${trip.to_city}` : "";
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#fbf8f1;font-family:Arial,Helvetica,sans-serif;color:#0e304c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden">
<tr><td align="center" style="background:#fbf8f1;padding:26px 28px 18px;border-bottom:1px solid #e8e1d3"><img src="${SITE_URL}/brand/logo-email.png" width="170" height="145" alt="Send By Me" style="display:block;border:0;width:170px;height:auto"></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 10px;font-size:21px">Bonjour ${escape(b.recipient_name as string)}, un colis arrive pour vous</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.5;color:#2b4964">${escape(from)} vous envoie un colis de ${Number(b.weight_kg)} kg ${escape(route)} avec un voyageur Send By Me${trip?.transport_ref ? ` (vol ${escape(trip.transport_ref as string)})` : ""}.</p>
<p style="margin:0 0 8px;font-size:14px;color:#5f6f80">Votre code de réception</p>
<p style="margin:0 0 18px;font-size:36px;font-weight:bold;letter-spacing:8px;color:#0e304c">${code}</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.5;color:#2b4964"><b>Donnez ce code au voyageur seulement quand vous avez le colis en main.</b> C'est ce code qui confirme la réception et déclenche le paiement du voyageur. Ne le communiquez à personne d'autre.</p>
<a href="${track}" style="display:inline-block;background:#2f7a82;color:#fff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:999px">Suivre le colis</a>
<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#5f6f80">Numéro de suivi : ${escape(b.tracking_code as string)}<br>Le bouton ne s'ouvre pas ? Copiez cette adresse : <span style="color:#2f7a82;word-break:break-all">${plain(track)}</span></p>
</td></tr>
<tr><td style="padding:16px 28px;background:#fbf8f1;font-size:12px;color:#5f6f80">Vous recevez cet e-mail parce que ${escape(from)} vous a indiqué comme destinataire d'un envoi Send By Me.</td></tr>
</table></td></tr></table></body></html>`;

  const sent = await sendEmail({ email: b.recipient_email as string, name: b.recipient_name as string }, `${from} vous envoie un colis : votre code de réception`, html);
  if (sent) await db.from("bookings").update({ recipient_notified_at: new Date().toISOString() }).eq("id", bookingId);
  return sent;
}
