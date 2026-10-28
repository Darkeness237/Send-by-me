import { advanceTransit } from "@/lib/transit";

/**
 * Avance le suivi des colis d'après les horaires des vols (« En transit », « Arrivé »).
 * Appelé toutes les 15 minutes par la tâche planifiée Netlify. Sans risque si quelqu'un l'appelle :
 * seules les étapes dont l'heure est passée sont enregistrées, une seule fois chacune.
 */
export async function GET() {
  const advanced = await advanceTransit();
  return Response.json({ advanced }, { headers: { "Cache-Control": "no-store", "Netlify-CDN-Cache-Control": "no-store" } });
}
