import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Lien de retour bien visible : flèche dans une bulle, sur une pastille. */
export function BackLink({ href, label, tone = "light" }: { href: string; label: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold shadow-sm transition ${
        dark ? "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20" : "bg-card text-ink ring-1 ring-line hover:ring-brand"
      }`}
    >
      <span
        className={`grid h-8 w-8 place-items-center rounded-full transition group-hover:-translate-x-0.5 ${dark ? "bg-white text-navy" : "bg-brand-fill text-white"}`}
        aria-hidden="true"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
      </span>
      {label}
    </Link>
  );
}
