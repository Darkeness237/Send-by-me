import { BadgeCheck } from "lucide-react";
import { initials } from "@/lib/format";

const tones = ["bg-brand-pale text-brand-deep", "bg-signal/30 text-ink", "bg-ok-pale text-ok", "bg-ink/10 text-ink"];

export function Avatar({ name, verified, size = 40 }: { name: string; verified?: boolean; size?: number }) {
  const tone = tones[(name.charCodeAt(0) || 0) % tones.length];
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className={`inline-flex h-full w-full items-center justify-center rounded-full font-bold ${tone}`}
        style={{ fontSize: size * 0.36 }}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
      {verified && (
        <BadgeCheck
          className="absolute -right-1 -bottom-1 rounded-full bg-white text-brand"
          style={{ width: size * 0.45, height: size * 0.45 }}
          aria-label="Identité vérifiée"
        />
      )}
    </span>
  );
}
