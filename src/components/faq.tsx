import { ChevronDown } from "lucide-react";
import { getT } from "@/i18n/server";

export const FAQ_ITEMS: Array<[string, string]> = [
  [
    "Que se passe-t-il si mon colis n'arrive pas ?",
    "Le voyageur n'est payé qu'une fois le code de remise saisi. Si la livraison n'a pas lieu, signalez-le depuis votre réservation : l'équipe examine le dossier et vous rembourse le montant bloqué.",
  ],
  [
    "Comment fonctionne le code de remise ?",
    "Après le paiement, vous recevez un code de 6 chiffres. Transmettez-le à votre destinataire. Il le donne au voyageur au moment où il reçoit le colis, et le voyageur le saisit dans l'application.",
  ],
  [
    "Qu'est-ce que je n'ai pas le droit d'envoyer ?",
    "Argent liquide, liquides de plus de 100 ml en avion, produits inflammables, armes, médicaments sans ordonnance, produits illicites, et tout ce qui est interdit par les douanes du pays d'arrivée. Le voyageur peut ouvrir le colis devant vous.",
  ],
  [
    "Combien gagne un voyageur ?",
    "Le prix au kilo qu'il a fixé, sans commission prélevée sur sa part. Les frais de service sont payés par l'expéditeur.",
  ],
  [
    "Puis-je payer par Orange Money ou MTN MoMo ?",
    "Le paiement par carte est disponible dès maintenant. Le Mobile Money arrive pour les envois au départ de l'Afrique.",
  ],
];

export async function FAQ() {
  const t = await getT();
  return (
    <div className="divide-y divide-line border-y border-line">
      {FAQ_ITEMS.map(([q, a]) => (
        <details key={q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
            {t(q)}
            <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="mt-3 max-w-[62ch] leading-relaxed text-muted">{t(a)}</p>
        </details>
      ))}
    </div>
  );
}
