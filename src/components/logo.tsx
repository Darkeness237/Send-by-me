type Props = { className?: string; withWordmark?: boolean; tone?: "dark" | "light" };

/**
 * Logo Send By Me : un colis dont le ruban devient une trajectoire d'avion.
 * Reprend l'idée d'origine (colis + avion) en une forme simple, lisible en 16 px.
 */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#FFC21A" />
      {/* colis */}
      <path d="M12 19.5 24 14l12 5.5v13L24 38l-12-5.5z" fill="#0F1E3D" />
      <path d="M12 19.5 24 25l12-5.5" fill="none" stroke="#FFC21A" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M24 25v13" stroke="#FFC21A" strokeWidth="1.6" />
      {/* ruban qui s'envole en trajectoire */}
      <path
        d="M18 16.8 30 22.3"
        stroke="#0A7CD6"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M30 22.3c4.2-6.3 7.6-9.7 11-11.3"
        fill="none"
        stroke="#0F1E3D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="0.1 4"
      />
      <path d="m41.8 7.6 1.2 5.4-5.2-1.6z" fill="#0F1E3D" />
    </svg>
  );
}

export function Logo({ className = "", withWordmark = true, tone = "dark" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      {withWordmark && (
        <span
          className={`wide text-[19px] font-extrabold tracking-tight ${tone === "dark" ? "text-ink" : "text-white"}`}
        >
          Send By Me
        </span>
      )}
    </span>
  );
}
