import { notFound } from "next/navigation";

// Adresse inconnue : affiche la page 404 du site (avec son en-tête), dans la langue du visiteur.
export default function Unknown() {
  notFound();
}
