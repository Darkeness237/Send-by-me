type Props = { className?: string; withWordmark?: boolean; tone?: "dark" | "light" };

/**
 * Logo Send By Me : deux mains (orange, bleu-vert) qui portent le colis, l'avion s'échappant de l'anneau.
 * Version vectorielle du logo d'origine, simplifiée pour rester lisible en petite taille.
 */
export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {/* anneau : deux demi-cercles qui se rejoignent en bas, ouvert en haut à droite pour l'avion */}
      <path d="M32 59A27 27 0 0 1 13.2 12.6" fill="none" stroke="#F28C28" strokeWidth="5" strokeLinecap="round"/>
      <path d="M32 59A27 27 0 0 0 57.6 23.4" fill="none" stroke="#1E8C9E" strokeWidth="5" strokeLinecap="round"/>
      {/* colis */}
      <path d="M21.5 24.6 32 19.6l10.5 5V36L32 41.2 21.5 36z" fill="#F7A33A"/>
      <path d="M21.5 24.6 32 29.6l10.5-5-10.5-5z" fill="#FBC56C"/>
      <path d="M32 29.6v11.6L42.5 36V24.6z" fill="#D9721A"/>
      <path d="M26.7 22.1 37.2 27.1v4.2" fill="none" stroke="#FFF3DC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      {/* liseré blanc : détache les mains de l'anneau */}
      <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 38.5C12 45 17 48.6 22.5 49M54.5 38.5C52 45 47 48.6 41.5 49" strokeWidth="10"/>
      <path d="M23.5 42.6h6.2M23.8 45.4h7.4M23.8 48.2h7M23.5 51h5.4M40.5 42.6h-6.2M40.2 45.4h-7.4M40.2 48.2h-7M40.5 51h-5.4" strokeWidth="4.6"/>
      <path d="M19.2 44.4 21 38.2M44.8 44.4 43 38.2" strokeWidth="5.4"/>
      </g>
      {/* main gauche (orange) : paume, quatre doigts vers le centre, pouce relevé */}
      <g fill="none" stroke="#F28C28" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 38.5C12 45 17 48.6 22.5 49" strokeWidth="7"/>
      <path d="M23.5 42.6h6.2M23.8 45.4h7.4M23.8 48.2h7M23.5 51h5.4" strokeWidth="2.4"/>
      <path d="M19.2 44.4 21 38.2" strokeWidth="3.2"/>
      </g>
      {/* main droite (bleu-vert), en miroir */}
      <g fill="none" stroke="#1E8C9E" strokeLinecap="round" strokeLinejoin="round">
      <path d="M54.5 38.5C52 45 47 48.6 41.5 49" strokeWidth="7"/>
      <path d="M40.5 42.6h-6.2M40.2 45.4h-7.4M40.2 48.2h-7M40.5 51h-5.4" strokeWidth="2.4"/>
      <path d="M44.8 44.4 43 38.2" strokeWidth="3.2"/>
      </g>
      {/* avion */}
      <g transform="translate(47.6 13.2) rotate(45) translate(-12 -12)">
      <path d="M21 16v-2l-8-5V3.5C13 2.7 12.3 2 11.5 2S10 2.7 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill="#1E8C9E"/>
      </g>
    </svg>
  );
}

export function Logo({ className = "", withWordmark = true, tone = "dark" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {tone === "light" ? (
        <span className="rounded-xl bg-[#FFF4E0] p-0.5">
          <LogoMark className="h-9 w-9" />
        </span>
      ) : (
        <LogoMark />
      )}
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
