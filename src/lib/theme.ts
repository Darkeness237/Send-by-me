export type ThemePref = "auto" | "light" | "dark";
export const THEME_KEY = "sbm-theme";
export const THEME_EVENT = "sbm-theme-change";

/**
 * Exécuté avant l'affichage : pose data-theme sur <html> sans flash blanc.
 * « auto » suit le réglage du téléphone (souvent sombre la nuit) et change en direct avec lui.
 */
export const THEME_SCRIPT = `(function(){try{var k="${THEME_KEY}",m=matchMedia("(prefers-color-scheme: dark)");function a(){var q=localStorage.getItem(k)||"auto";document.documentElement.dataset.theme=q==="dark"||(q==="auto"&&m.matches)?"dark":"light"}a();m.addEventListener("change",a);addEventListener("storage",a);addEventListener("${THEME_EVENT}",a)}catch(e){}})();`;
