import { Award } from "lucide-react";

/** Badge du programme Ambassadeur (voyageur régulier, vérifié et bien noté). */
export function AmbassadorBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-signal/15 font-semibold text-signal-deep ${size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}
      title="Ambassadeur Send By Me : voyageur régulier, identité vérifiée et très bien noté"
    >
      <Award className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />
      Ambassadeur
    </span>
  );
}
