import "server-only";

// Brevo : e-mails transactionnels (notifications) et SMS (code de vérification du téléphone).
// Sans BREVO_API_KEY, rien n'est envoyé et les fonctions renvoient false.

const API = "https://api.brevo.com/v3";
const key = () => process.env.BREVO_API_KEY;

export const isBrevoConfigured = () => Boolean(key());
export const isSmsConfigured = () => Boolean(key() && process.env.BREVO_SMS_SENDER);

async function call(path: string, body: unknown) {
  if (!key()) return false;
  try {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "api-key": key()!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("Brevo", path, res.status);
    return res.ok;
  } catch {
    return false;
  }
}

export function sendEmail(to: { email: string; name?: string }, subject: string, html: string) {
  return call("/smtp/email", {
    sender: { name: "Send By Me", email: process.env.BREVO_SENDER_EMAIL ?? "noreply@send-by-me.com" },
    to: [to],
    subject,
    htmlContent: html,
  });
}

export function sendSms(phone: string, content: string) {
  return call("/transactionalSMS/sms", {
    sender: process.env.BREVO_SMS_SENDER ?? "SendByMe",
    recipient: phone.replace(/[^\d+]/g, "").replace(/^\+/, ""),
    content,
    type: "transactional",
  });
}
