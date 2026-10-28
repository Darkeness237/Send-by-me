import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/prose-page";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Sécurité et confiance"),
    description: t("Paiement bloqué, code de remise, identités vérifiées, avis : comment Send By Me protège expéditeurs et voyageurs."),
    alternates: { canonical: "/securite" },
  };
}

export default async function Security() {
  const t = await getT();
  return (
    <ProsePage
      title={t("Sécurité et confiance")}
      intro={t("Confier un colis ou en transporter un demande de la confiance. Voici ce que nous faisons pour la mériter, et les règles que nous demandons à chacun de suivre.")}
    >
      <section>
        <h2>{t("Le paiement reste bloqué jusqu'à la remise")}</h2>
        <p>
          {t("L'expéditeur paie en ligne par carte. Le montant est conservé par Send By Me et n'est versé au voyageur qu'après la saisie du code de remise. Si le colis n'est pas livré, l'expéditeur est remboursé après examen du dossier.")}
        </p>
      </section>
      <section>
        <h2>{t("Le code de remise")}</h2>
        <p>
          {t("Un code à 6 chiffres est créé après le paiement. Seul l'expéditeur le voit, et le transmet à son destinataire. Le voyageur ne peut valider la livraison qu'avec ce code. Après 5 essais incorrects, la validation est bloquée et notre équipe intervient.")}
        </p>
      </section>
      <section>
        <h2>{t("Identité vérifiée")}</h2>
        <p>
          {t("Le badge bleu veut dire que la pièce d'identité du membre et son selfie ont été contrôlés. Nous vous conseillons de privilégier les voyageurs vérifiés et ayant déjà des avis.")}
        </p>
      </section>
      <section>
        <h2>{t("Trajet vérifié")}</h2>
        <p>
          {t("Le voyageur peut nous envoyer son billet ou sa carte d'embarquement. Si le nom, le trajet et la date correspondent, son trajet reçoit le badge « Trajet vérifié ». Les documents d'identité et les billets sont stockés dans un espace privé, consultés uniquement par l'équipe, puis supprimés dès la fin du contrôle.")}
        </p>
      </section>
      <section>
        <h2>{t("Compte certifié")}</h2>
        <p>
          {t("Un membre certifié a fait vérifier son identité (pièce officielle et selfie) et son adresse (justificatif de domicile de moins de 3 mois). Il porte le badge doré « Compte certifié ».")}
        </p>
      </section>
      <section>
        <h2>{t("Vols contrôlés automatiquement")}</h2>
        <p>
          {t("À la publication, nous vérifions que la compagnie, le numéro de vol, les aéroports et la franchise bagage sont cohérents avec le trajet annoncé. Quand c'est possible, le vol est aussi recherché dans les horaires réels des compagnies.")}
        </p>
      </section>
      <section>
        <h2>{t("Les règles à suivre")}</h2>
        <ul>
          <li>{t("Payez toujours sur Send By Me. Un paiement en espèces ou par transfert direct n'est pas protégé.")}</li>
          <li>{t("Le voyageur contrôle le contenu du colis devant l'expéditeur, avant de le fermer.")}</li>
          <li>{t("Le voyageur peut refuser un colis à tout moment s'il a un doute.")}</li>
          <li>
            {t("Aucun")}{" "}<Link href="/objets-interdits" className="font-semibold text-brand">{t("objet interdit")}</Link>{t(", même en petite quantité.")}
          </li>
          <li>{t("Ne partagez pas le code de remise avec le voyageur : c'est le destinataire qui le lui donne.")}</li>
        </ul>
      </section>
      <section>
        <h2>{t("Signaler un problème")}</h2>
        <p>
          {t("Écrivez-nous à")}{" "}<a href="mailto:support@send-by-me.com" className="font-semibold text-brand">{t("support@send-by-me.com")}</a>{" "}{t("en indiquant le lien de la réservation. Le paiement reste bloqué le temps de l'examen.")}
        </p>
      </section>
    </ProsePage>
  );
}
