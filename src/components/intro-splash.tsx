import Image from "next/image";
import base from "../../public/brand/logo-symbol-base.png";
import plane from "../../public/brand/logo-plane.png";

/**
 * Animation d'ouverture : les mains et le colis apparaissent, l'avion décolle de l'anneau,
 * puis le nom glisse dessous et l'écran s'efface. CSS uniquement, une fois par visite
 * (script de <head>), désactivée si l'appareil demande moins d'animations.
 */
export function IntroSplash() {
  return (
    <div className="intro-splash" aria-hidden="true">
      <div className="intro-splash__inner">
        <span className="relative block h-32 w-32">
          <Image src={base} alt="" priority sizes="128px" className="intro-splash__base absolute inset-0 h-full w-full" />
          <Image src={plane} alt="" priority sizes="128px" className="intro-splash__plane absolute inset-0 h-full w-full" />
        </span>
        <p className="intro-splash__word display text-3xl text-ink">Send By Me</p>
        <span className="intro-splash__trail" />
      </div>
    </div>
  );
}

/** À placer dans <head> : n'affiche l'animation qu'à la première page de la visite. */
export const INTRO_SCRIPT = `try{if(sessionStorage.getItem("sbm-intro"))document.documentElement.classList.add("no-intro");else sessionStorage.setItem("sbm-intro","1")}catch(e){}`;
