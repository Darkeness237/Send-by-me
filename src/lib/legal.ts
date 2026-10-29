// Identité légale de l'éditeur, reprise par les mentions légales et les CGU.
// Les valeurs entre crochets sont à compléter avant le lancement public.

export const PUBLISHER = {
  /** Prénom et NOM, suivis de « EI » (obligatoire pour un entrepreneur individuel depuis 2022). */
  name: "[Prénom NOM] EI",
  tradeName: "Send By Me",
  status: "Entrepreneur individuel (régime de la micro-entreprise)",
  siret: "[SIRET à 14 chiffres]",
  /** Adresse du domicile ou de la domiciliation déclarée à l'INSEE. */
  address: "[Adresse postale complète]",
  phone: "[Numéro de téléphone]",
  email: "contact@send-by-me.com",
  /** Franchise en base : pas de TVA collectée. */
  vat: "TVA non applicable, article 293 B du Code général des impôts",
  director: "[Prénom NOM]",
} as const;

export const MEDIATOR = {
  name: "[Nom du médiateur de la consommation]",
  website: "[Site du médiateur]",
  address: "[Adresse postale du médiateur]",
} as const;

export const HOSTS = [
  {
    role: "Hébergement du site",
    name: "Netlify, Inc.",
    address: "101 2nd Street, San Francisco, CA 94105, États-Unis",
    website: "https://www.netlify.com",
  },
  {
    role: "Hébergement de la base de données (serveurs situés à Paris, région AWS eu-west-3)",
    name: "Supabase Pte. Ltd.",
    address: "65 Chulia Street #38-02/03, OCBC Centre, Singapour 049513",
    website: "https://supabase.com",
  },
] as const;

/** Date d'entrée en vigueur affichée en tête des documents légaux. */
export const LEGAL_UPDATED = "29 octobre 2026";
