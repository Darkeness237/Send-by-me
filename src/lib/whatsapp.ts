import "server-only";

// Notifications WhatsApp par l'API WhatsApp Business Cloud de Meta.
// Hors d'une conversation ouverte par le membre, WhatsApp n'accepte que des modèles de message
// approuvés par Meta. Le modèle attendu (catégorie « Utilitaire ») a trois variables :
//   {{1}} le titre, {{2}} le détail, {{3}} le lien (chemin sur send-by-me.com).
// Variables d'environnement : WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
// WHATSAPP_TEMPLATE (défaut sbm_notification) et WHATSAPP_TEMPLATE_LANG (défaut fr).

const token = process.env.WHATSAPP_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const template = process.env.WHATSAPP_TEMPLATE || "sbm_notification";
const lang = process.env.WHATSAPP_TEMPLATE_LANG || "fr";

export const isWhatsAppConfigured = () => Boolean(token && phoneId);

/** Numéro au format international sans « + » ni espaces, comme l'attend WhatsApp. */
const waNumber = (phone: string) => phone.replace(/[^0-9]/g, "");

export async function sendWhatsApp(phone: string, title: string, body: string, path: string) {
  if (!isWhatsAppConfigured()) return;
  const text = (s: string, max: number) => ({ type: "text", text: s.replace(/\s+/g, " ").trim().slice(0, max) || "-" });
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: waNumber(phone),
      type: "template",
      template: { name: template, language: { code: lang }, components: [{ type: "body", parameters: [text(title, 120), text(body, 400), text(path, 200)] }] },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
