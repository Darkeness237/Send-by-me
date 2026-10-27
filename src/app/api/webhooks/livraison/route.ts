import { applyDeliveryOutcome } from "@/lib/delivery-ops";
import { isPartnerWebhookAuthorized } from "@/lib/delivery-partner";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notifications du partenaire de livraison à domicile.
 * Corps attendu : { "tracking_code": "SBM-XXXXXXXX", "status": "scheduled" | "out_for_delivery" | "delivered" | "failed", "note"?: string }
 */
export async function POST(request: Request) {
  if (!isPartnerWebhookAuthorized(request.headers.get("authorization"))) return new Response("Non autorisé", { status: 401 });
  const body = (await request.json().catch(() => null)) as { tracking_code?: string; status?: string; note?: string } | null;
  const code = body?.tracking_code?.toUpperCase();
  if (!code || !/^SBM-[A-Z0-9]{8}$/.test(code)) return new Response("Numéro de suivi invalide", { status: 400 });

  const db = createAdminClient();
  const { data: b } = await db.from("bookings").select("id").eq("tracking_code", code).maybeSingle();
  if (!b) return new Response("Envoi inconnu", { status: 404 });

  switch (body?.status) {
    case "scheduled":
      await db.from("bookings").update({ delivery_status: "scheduled" }).eq("id", b.id);
      break;
    case "out_for_delivery":
      await db.from("bookings").update({ delivery_status: "out_for_delivery" }).eq("id", b.id);
      await db.from("booking_events").upsert({ booking_id: b.id, kind: "out_for_delivery" }, { onConflict: "booking_id,kind", ignoreDuplicates: true });
      break;
    case "delivered":
    case "failed":
      await applyDeliveryOutcome(b.id, body.status, body.note);
      break;
    default:
      return new Response("Statut inconnu", { status: 400 });
  }
  return Response.json({ received: true });
}
