import { syncPendingConnectAccounts } from "@/lib/stripe-connect";
import { advanceTransit } from "@/lib/transit";

/**
 * Avance le suivi des colis d'après les horaires des vols (« En transit », « Arrivé »).
 * Appelé toutes les 15 minutes par la tâche planifiée Netlify. Sans risque si quelqu'un l'appelle :
 * seules les étapes dont l'heure est passée sont enregistrées, une seule fois chacune.
 * Vérifie aussi les comptes de versement en attente de Stripe (versement dès leur validation).
 */
export async function GET() {
  const [advanced, payouts] = await Promise.all([advanceTransit(), syncPendingConnectAccounts()]);
  return Response.json({ advanced, payouts }, { headers: { "Cache-Control": "no-store", "Netlify-CDN-Cache-Control": "no-store" } });
}
