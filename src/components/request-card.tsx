import Link from "next/link";
import { CalendarDays, House, Package } from "lucide-react";
import { Avatar } from "@/components/avatar";
import type { ShipmentRequest } from "@/lib/data";
import { kg } from "@/lib/format";
import { codeFor } from "@/lib/places";
import { CATEGORIES } from "@/lib/types";
import { getLocale, getT } from "@/i18n/server";

const shortDate = (d: string, lang: "fr" | "en" = "fr") =>
  new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00Z`));
const photoUrl = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/request-photos/${path}`;

export { photoUrl, shortDate };

/** Carte d'une demande d'envoi (liste publique et correspondances). */
export async function RequestCard({ r }: { r: ShipmentRequest }) {
  const t = await getT();
  const lang = await getLocale();
  return (
    <Link href={`/demandes/${r.id}`} className="flex gap-4 rounded-3xl bg-card p-4 ring-1 ring-line transition hover:ring-brand/50 sm:p-5">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-paper">
        {r.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(r.photos[0])} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Package className="absolute inset-0 m-auto h-8 w-8 text-signal" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="wide tabular text-lg text-ink">
          {codeFor(r.from_city)} → {codeFor(r.to_city)}
          <span className="ml-2 text-sm font-semibold text-muted">
            {r.from_city} → {r.to_city}
          </span>
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {kg(Number(r.weight_kg), lang)} · {t(CATEGORIES.find((c) => c.id === r.category)?.label ?? "")}
        </p>
        <p className="mt-1 line-clamp-1 text-sm text-muted">{r.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {t("du {from} au {to}", { from: shortDate(r.earliest_date, lang), to: shortDate(r.latest_date, lang) })}
          </span>
          {r.wants_home_delivery && (
            <span className="flex items-center gap-1">
              <House className="h-3.5 w-3.5" aria-hidden="true" /> {t("livraison à domicile")}
            </span>
          )}
          {r.sender && (
            <span className="flex items-center gap-1.5">
              <Avatar name={r.sender.full_name || "Membre"} verified={r.sender.id_verified} certified={r.sender.certified} src={r.sender.avatar_url} size={18} />
              {r.sender.full_name}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
