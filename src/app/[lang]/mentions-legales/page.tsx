import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/prose-page";
import { getT } from "@/i18n/server";
import { HOSTS, LEGAL_UPDATED, MEDIATOR, PUBLISHER } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Mentions légales"), alternates: { canonical: "/mentions-legales" } };
}

export default function LegalNotice() {
  return (
    <ProsePage frenchOnly title="Mentions légales" intro={`À jour au ${LEGAL_UPDATED}.`}>
      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le site send-by-me.com et l&apos;application Send By Me sont édités par {PUBLISHER.name}, {PUBLISHER.status}, exerçant
          sous le nom commercial « {PUBLISHER.tradeName} ».
        </p>
        <ul>
          <li>SIRET : {PUBLISHER.siret}</li>
          <li>Adresse : {PUBLISHER.address}</li>
          <li>Téléphone : {PUBLISHER.phone}</li>
          <li>
            E-mail : <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>
          </li>
          <li>{PUBLISHER.vat}</li>
        </ul>
      </section>
      <section>
        <h2>Directeur de la publication</h2>
        <p>{PUBLISHER.director}</p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <ul>
          {HOSTS.map((h) => (
            <li key={h.name}>
              {h.role} : {h.name}, {h.address} ({h.website}).
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Paiements</h2>
        <p>
          Les paiements sont traités par Stripe Payments Europe, Ltd., établissement de monnaie électronique agréé par la Banque
          centrale d&apos;Irlande. Send By Me ne voit ni ne conserve les numéros de carte.
        </p>
      </section>
      <section>
        <h2>Activité</h2>
        <p>
          Send By Me est une plateforme de mise en relation entre particuliers. Elle n&apos;est ni transporteur, ni commissionnaire de
          transport : le transport des colis est assuré par les voyageurs eux-mêmes. Le fonctionnement du service est décrit dans
          les <Link href="/cgu">conditions d&apos;utilisation</Link>.
        </p>
      </section>
      <section>
        <h2>Médiation de la consommation</h2>
        <p>
          En cas de litige avec Send By Me non résolu par notre service client, vous pouvez saisir gratuitement le médiateur de la
          consommation : {MEDIATOR.name}, {MEDIATOR.address}, {MEDIATOR.website}.
        </p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          Le nom Send By Me, le logo, les textes, les visuels et le code du site sont protégés. Toute reproduction sans autorisation
          écrite est interdite. Les contenus publiés par les membres (annonces, photos, avis) restent leur propriété ; ils accordent à
          Send By Me le droit de les afficher sur le service.
        </p>
      </section>
      <section>
        <h2>Données personnelles</h2>
        <p>
          Le traitement des données personnelles est décrit dans la <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
      </section>
      <section>
        <h2>Signaler un contenu</h2>
        <p>
          Pour signaler une annonce, un message ou un avis illicite, utilisez le bouton « Signaler » du service ou écrivez à{" "}
          <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a> en précisant l&apos;adresse de la page et le motif.
        </p>
      </section>
    </ProsePage>
  );
}
