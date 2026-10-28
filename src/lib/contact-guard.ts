// Messagerie : les coordonnées personnelles ne s'échangent pas (téléphone, e-mail, WhatsApp…).
// Les appels passent par la plateforme ; un échange hors plateforme n'est ni protégé ni remboursable.

const WORDS: Record<string, string> = {
  zero: "0", zéro: "0", un: "1", une: "1", deux: "2", trois: "3", quatre: "4", cinq: "5", six: "6", sept: "7", huit: "8", neuf: "9",
  dix: "10", onze: "11", douze: "12", treize: "13", quatorze: "14", quinze: "15", seize: "16", vingt: "20", trente: "30",
  quarante: "40", cinquante: "50", soixante: "60", one: "1", two: "2", three: "3", four: "4", five: "5", seven: "7", eight: "8", nine: "9",
};

export const CONTACT_BLOCKED_MESSAGE =
  "Pour votre sécurité, les numéros de téléphone et adresses e-mail ne peuvent pas être échangés. Utilisez l'appel intégré à Send By Me.";

/** Vrai si le texte contient un numéro de téléphone, une adresse e-mail ou un lien de messagerie externe, même déguisé. */
export function containsContactDetails(text: string) {
  const lower = text.toLowerCase();
  if (/[^@\s]+@[^@\s]+\.[a-z]{2,}/.test(lower) || /\b[a-z0-9._-]+\s*(\(at\)|\[at\]| at | arobase )\s*[a-z0-9-]+\s*(\.|point|dot)\s*[a-z]{2,}/.test(lower)) return true;
  if (/(wa\.me|whatsapp|watsap|wattsapp|telegram|t\.me\/|signal\s*:|snap(chat)?\s*:|insta(gram)?\s*:)/.test(lower)) return true;

  // Nombres écrits en lettres et lettres qui imitent des chiffres (« zéro six », « O6 »).
  const spelled = lower
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b([a-z]+)\b/g, (w) => WORDS[w] ?? WORDS[w.normalize("NFC")] ?? w)
    .replace(/(?<=\d)[o](?=\d)|(?<=\s|^)o(?=\d)/g, "0");
  // Chiffres séparés par des espaces, points, tirets, barres ou parenthèses : on les recolle.
  for (const source of [lower, spelled]) {
    const glued = source.replace(/(?<=\d)[\s.\-_/()]+(?=[\d+(])/g, "").replace(/\+(?=\d)/g, "");
    if (/\d{8,}/.test(glued)) return true;
  }
  return false;
}
