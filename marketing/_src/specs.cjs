// Catalogue des visuels statiques. Les légendes alimentent marketing/CONTENUS.md.
// Règle : aucun chiffre ni témoignage inventé. Les montants sont des exemples signalés comme tels.
const SQ = [1080, 1080], PT = [1080, 1350], ST = [1080, 1920], FB = [1200, 628], LI = [1200, 627], YT = [1920, 1080];
const A6 = [1240, 1748], A4 = [2480, 3508];

const P = {
  voy: 'voyageuse-valise.jpg', remise: 'remise-colis.jpg', valise: 'preparer-valise.jpg', aero: 'aeroport-depart.jpg', famille: 'cadeau-famille.jpg',
  lagos: 'px-30677594.jpg', hublot: 'px-3646733.jpg', terminal: 'px-3885493.jpg', scotch: 'px-4247766.jpg', sofa: 'px-5711715.jpg',
  appel: 'px-5991144.jpg', unbox: 'px-6017745.jpg', habits: 'px-6612087.jpg', aile: 'px-731217.jpg', mug: 'px-7464379.jpg', carton: 'px-7464408.jpg', mockup: 'px-9429449.jpg',
};
const HT = '#SendByMe #KilosLibres #ColisAfrique #Diaspora';
const ticketDLA = { type: 'ticket' };
const parcelDSS = { type: 'parcel' };

const S = [];
const add = (folder, file, size, tpl, p, caption, where) => S.push({ folder, file, size, tpl, p, caption, where });

// ─── 01 · Campagne de lancement « Kilos libres » ─────────────────────────────
const L1 = '01-lancement';
add(L1, 'teaser-j7-post', SQ, 'countdown', { big: 'J-7', title: 'Vos colis vont bientôt voyager autrement.', text: 'Une nouvelle façon d’envoyer des colis entre l’Europe et l’Afrique arrive.', cta: 'Suivez-nous' },
  `Dans 7 jours, quelque chose change pour vos colis entre l’Europe et l’Afrique. ✈️📦\nActivez les notifications pour ne pas rater le lancement.\n${HT}`, 'Instagram, Facebook (feed)');
add(L1, 'teaser-j7-story', ST, 'countdown', { big: 'J-7', title: 'Vos colis vont bientôt voyager autrement.', cta: 'Activer le rappel' }, 'Story avec sticker « Rappel » sur la date de lancement.', 'Instagram, Facebook (story), statut WhatsApp');
add(L1, 'teaser-j3-post', SQ, 'countdown', { big: 'J-3', title: 'Des voyageurs. Des kilos libres. Vos colis.', text: 'Paiement bloqué jusqu’à la livraison.', cta: 'send-by-me.com' },
  `J-3. Des voyageurs vérifiés, des kilos libres dans leurs valises, et vos colis pour la famille. Le paiement reste bloqué jusqu’à la livraison.\n${HT}`, 'Instagram, Facebook (feed)');
add(L1, 'teaser-j3-story', ST, 'countdown', { big: 'J-3', title: 'Des voyageurs. Des kilos libres. Vos colis.', cta: 'send-by-me.com' }, 'Story J-3 avec sondage : « Vous envoyez souvent des colis au pays ? Oui / Non ».', 'Instagram, Facebook (story)');
add(L1, 'teaser-j1-post', SQ, 'countdown', { big: 'J-1', title: 'Demain, on décolle.', text: 'Préparez vos valises… et vos colis.', cta: 'send-by-me.com' },
  `Demain, on décolle. 🛫\nVoyageurs : préparez vos kilos libres. Expéditeurs : préparez vos colis.\n${HT}`, 'Instagram, Facebook (feed)');
add(L1, 'teaser-j1-story', ST, 'countdown', { big: 'J-1', title: 'Demain, on décolle.', cta: 'Activer le rappel' }, 'Story avec compte à rebours Instagram jusqu’au lancement.', 'Instagram (story)');
add(L1, 'jour-j-post', SQ, 'photoHero', { photo: P.voy, pos: '50% 22%', eyebrow: 'C’est parti', title: 'Vos colis voyagent dans la <span class="hl">valise</span> de quelqu’un.', text: 'Des voyageurs vérifiés, entre l’Europe et l’Afrique.', cta: 'Découvrir Send By Me' },
  `C’est le grand jour : Send By Me est en ligne ! 🎉\nDes voyageurs vérifiés proposent leurs kilos libres entre l’Europe et l’Afrique. Vous payez en ligne, et l’argent reste bloqué jusqu’à ce que votre destinataire ait le colis en main.\n👉 send-by-me.com\n${HT} #Lancement`, 'Instagram, Facebook (feed)');
add(L1, 'jour-j-portrait', PT, 'photoHero', { photo: P.voy, pos: '50% 18%', eyebrow: 'Disponible maintenant', title: 'Vos colis voyagent dans la <span class="hl">valise</span> de quelqu’un.', chips: [['badge', 'Voyageurs vérifiés'], ['lock', 'Paiement bloqué'], ['key', 'Code de remise']], cta: 'send-by-me.com' },
  `Send By Me est en ligne. Envoyez vos colis avec des voyageurs vérifiés, payez en toute sécurité : le voyageur n’est payé qu’à la remise.\n${HT}`, 'Instagram (feed 4:5), Facebook');
add(L1, 'jour-j-story', ST, 'photoHero', { photo: P.voy, pos: '50% 20%', eyebrow: 'C’est parti', title: 'Vos colis voyagent dans la <span class="hl">valise</span> de quelqu’un.', cta: 'Lien en story' }, 'Story avec sticker lien vers send-by-me.com.', 'Instagram, Facebook (story), statut WhatsApp');
add(L1, 'jour-j-facebook', FB, 'photoHero', { photo: P.voy, pos: '50% 22%', eyebrow: 'Nouveau', title: 'Envoyez vos colis avec des voyageurs vérifiés.', text: 'L’argent reste bloqué jusqu’à la livraison.', cta: 'Découvrir' },
  'Publicité Facebook — Titre : « Envoyez vos colis avec des voyageurs vérifiés » · Texte : « Europe ↔ Afrique. Paiement bloqué jusqu’à la livraison. » · Bouton : En savoir plus.', 'Facebook Ads (lien 1,91:1)');
add(L1, 'jour-j-youtube', YT, 'photoHero', { photo: P.voy, pos: '50% 22%', eyebrow: 'Send By Me', title: 'Vos colis voyagent dans la <span class="hl">valise</span> de quelqu’un.', text: 'Voyageurs vérifiés · Paiement bloqué · Code de remise', cta: 'send-by-me.com' }, 'Miniature YouTube / bannière de chaîne / couverture Facebook.', 'YouTube, couverture Facebook');
add(L1, 'manifeste', PT, 'typo', { bg: 'ink', eyebrow: 'Pourquoi Send By Me', title: 'Parce qu’un colis pour la famille, ce n’est jamais « juste un colis ».', text: 'Des vêtements pour les enfants, un téléphone pour maman, des papiers importants. On a construit Send By Me pour que vous puissiez les confier sans crainte.', cta: 'send-by-me.com' },
  `Un colis pour la famille, ce n’est jamais « juste un colis ».\nC’est pour ça qu’on a construit Send By Me : des voyageurs vérifiés, un paiement bloqué jusqu’à la livraison, et un code que seul votre destinataire connaît.\n${HT}`, 'Instagram, Facebook, LinkedIn');

// ─── 02 · Voyageurs : « Rentabilisez vos kilos » ─────────────────────────────
const V = '02-voyageurs';
add(V, 'kilos-valeur-post', SQ, 'typo', { bg: 'signal', eyebrow: 'Vous partez bientôt ?', title: 'Vos kilos libres ont de la valeur.', el: { ...ticketDLA }, cta: 'Proposer mes kilos' },
  `Vous rentrez au pays avec de la place dans la valise ? Proposez vos kilos libres sur Send By Me et fixez votre prix.\nExemple : 23 kg à 9 €/kg = 207 € si tout part.\nPublier un trajet est gratuit. 👉 send-by-me.com/publier\n${HT} #Voyageur`, 'Instagram, Facebook (feed)');
add(V, 'kilos-valeur-story', ST, 'typo', { bg: 'signal', eyebrow: 'Vous partez bientôt ?', title: 'Vos kilos libres ont de la valeur.', el: { ...ticketDLA }, cta: 'Proposer mes kilos' }, 'Story avec lien vers /publier.', 'Instagram, Facebook (story), statut WhatsApp');
add(V, 'kilos-valeur-portrait', PT, 'photoHero', { photo: P.aero, pos: '50% 30%', eyebrow: 'Voyageurs', title: 'Votre valise a de la place ? <span class="hl">Rentabilisez-la.</span>', text: 'Vous fixez votre prix. Vous acceptez seulement les colis qui vous conviennent.', cta: 'Proposer mes kilos' },
  `Votre valise a de la place ? Rentabilisez-la. Vous fixez votre prix au kilo, vous choisissez les colis que vous acceptez, et vous êtes payé à la remise.\n${HT} #Voyageur`, 'Instagram (4:5), Facebook');
add(V, 'paye-remise-post', SQ, 'typo', { bg: 'ink', eyebrow: 'Voyageurs', title: 'Payé à la remise. <span style="color:#eb9332">À coup sûr.</span>', text: 'L’expéditeur paie avant que vous preniez le colis. L’argent vous est versé dès que le destinataire donne son code.', el: { type: 'codeCard', hidden: false } },
  `Fini de courir après l’argent après le voyage. Sur Send By Me, l’expéditeur paie en ligne avant que vous preniez le colis. Le paiement vous est versé dès que le destinataire donne son code de remise.\n${HT} #Voyageur`, 'Instagram, Facebook (feed)');
add(V, 'voir-contenu-post', SQ, 'photoHero', { photo: P.habits, pos: '50% 50%', eyebrow: 'Voyageurs', title: 'Vous voyez ce que vous transportez.', text: 'Le colis vous est présenté ouvert. Vous pouvez refuser.', chips: [['eye', 'Colis ouvert'], ['ban', 'Objets interdits refusés']] },
  `Transporter un colis, oui. Sans savoir ce qu’il y a dedans, non.\nSur Send By Me, l’expéditeur vous présente le colis ouvert. Vous vérifiez, puis vous le fermez ensemble. Liquides, argent liquide et produits illicites sont refusés.\n${HT} #Voyageur`, 'Instagram, Facebook (feed)');
add(V, 'gratuit-post', SQ, 'typo', { bg: 'brand', eyebrow: 'Voyageurs', title: 'Publier votre trajet : <span style="color:#eb9332">gratuit.</span>', text: 'Deux minutes pour proposer vos kilos. Vous recevez des demandes, vous choisissez.', chips: [['suitcase', 'Jusqu’à 300 kg'], ['plane', 'Avion, train, car, voiture']], cta: 'Publier mon trajet' },
  `Publier un trajet sur Send By Me est gratuit. Deux minutes suffisent : villes, date, kilos, prix. Vous recevez des demandes et vous acceptez celles qui vous conviennent.\n${HT} #Voyageur`, 'Instagram, Facebook (feed)');
add(V, 'billet-post', PT, 'photoHero', { photo: P.terminal, pos: '50% 50%', eyebrow: 'Voyageurs', title: 'Et si vos kilos aidaient à payer votre billet ?', text: 'Exemple : 23 kg libres à 9 € le kilo, c’est 207 € si tout part.', el: { type: 'ticket', size: 1 } },
  `Et si vos kilos libres aidaient à payer votre billet ? ✈️\nExemple : 23 kg à 9 € le kilo = 207 € si tous vos kilos partent. C’est vous qui fixez le prix.\n${HT} #Voyageur`, 'Instagram (4:5), Facebook');
add(V, 'voyageur-story-etapes', ST, 'steps', { bg: 'ink', title: 'Proposer vos kilos en 4 étapes', steps: [['plane', 'Publiez votre trajet', 'Villes, date, vol, kilos et prix.'], ['message', 'Recevez des demandes', 'Discutez avec l’expéditeur avant d’accepter.'], ['eye', 'Vérifiez le colis', 'Présenté ouvert au rendez-vous.'], ['euro', 'Soyez payé', 'Dès que le destinataire donne son code.']], cta: 'send-by-me.com/publier' }, 'Story explicative voyageur, à épingler en « À la une ».', 'Instagram, Facebook (story)');
add(V, 'voyageur-facebook', FB, 'photoHero', { photo: P.aero, pos: '50% 30%', eyebrow: 'Vous partez bientôt ?', title: 'Rentabilisez vos kilos libres.', text: 'Gratuit pour les voyageurs. Paiement garanti à la remise.', cta: 'Proposer mes kilos' },
  'Publicité Facebook — Titre : « Rentabilisez vos kilos libres » · Texte : « Vous rentrez au pays ? Proposez la place libre de votre valise. Vous fixez le prix, vous êtes payé à la remise. » · Bouton : S’inscrire.', 'Facebook Ads');
add(V, 'voyageur-linkedin', LI, 'typo', { bg: 'signal', eyebrow: 'Voyageurs fréquents', title: 'Vos allers-retours peuvent rapporter.', text: 'Étudiants, professionnels, familles : proposez vos kilos libres entre l’Europe et l’Afrique.', el: { type: 'ticket', size: 0.9 } },
  `Vous faites régulièrement l’aller-retour entre l’Europe et l’Afrique ? Vos kilos libres peuvent aider d’autres familles… et vous rapporter. Publier un trajet sur Send By Me est gratuit.\n#Diaspora #Afrique #Voyage`, 'LinkedIn, Facebook');

// ─── 03 · Expéditeurs : « Plus d’arnaque à l’avance » ────────────────────────
const E = '03-expediteurs';
add(E, 'arnaque-post', SQ, 'typo', { bg: 'ink', eyebrow: 'Expéditeurs', title: 'Plus d’arnaque à l’avance.', text: 'Votre argent reste bloqué jusqu’à ce que votre famille ait le colis en main.', el: { type: 'codeCard' } },
  `Payer d’avance un inconnu et espérer… c’est fini. Sur Send By Me, votre paiement reste bloqué jusqu’à la livraison. Le voyageur n’est payé que quand votre destinataire donne son code.\n${HT} #Expéditeur`, 'Instagram, Facebook (feed)');
add(E, 'arnaque-story', ST, 'typo', { bg: 'ink', eyebrow: 'Expéditeurs', title: 'Plus d’arnaque à l’avance.', text: 'Votre argent reste bloqué jusqu’à la livraison.', el: { type: 'codeCard' }, cta: 'Envoyer un colis' }, 'Story avec lien vers /demandes/nouvelle.', 'Instagram, Facebook (story), statut WhatsApp');
add(E, 'famille-valide-post', SQ, 'photoHero', { photo: P.remise, pos: '50% 50%', eyebrow: 'À l’arrivée', title: 'C’est votre famille qui valide la livraison.', text: 'Elle donne son code au voyageur. C’est ce geste qui libère le paiement.' },
  `À l’arrivée, c’est votre famille qui a le dernier mot. Le voyageur remet le colis en main propre, votre destinataire lui donne son code de remise, et c’est seulement là que le paiement est libéré.\n${HT} #Expéditeur`, 'Instagram, Facebook (feed)');
add(E, 'famille-valide-portrait', PT, 'photoHero', { photo: P.remise, pos: '60% 50%', eyebrow: 'Expéditeurs', title: 'C’est votre <span class="hl">famille</span> qui valide la livraison.', chips: [['key', 'Code à 6 chiffres'], ['lock', 'Paiement bloqué']], cta: 'Envoyer un colis' },
  `Seul votre destinataire connaît le code de remise. Sans lui, la livraison ne peut pas être validée. Simple, et rassurant.\n${HT}`, 'Instagram (4:5), Facebook');
add(E, 'demande-post', SQ, 'typo', { bg: 'paper', eyebrow: 'Nouveau', title: 'Publiez votre colis. Les voyageurs viennent à vous.', el: { ...parcelDSS }, cta: 'Publier une demande' },
  `Pas de trajet qui vous convient ? Publiez une demande d’envoi : poids, contenu, photos, dates. Les voyageurs qui partent sur votre ligne vous la proposent.\n${HT} #Expéditeur`, 'Instagram, Facebook (feed)');
add(E, 'demande-story', ST, 'typo', { bg: 'paper', eyebrow: 'Envoyer un colis', title: 'Publiez votre colis. Les voyageurs viennent à vous.', el: { ...parcelDSS }, cta: 'Publier une demande' }, 'Story avec lien vers /demandes/nouvelle.', 'Instagram, Facebook (story)');
add(E, 'prix-affiche-post', SQ, 'typo', { bg: 'brand', eyebrow: 'Transparence', title: 'Le prix est affiché avant de réserver.', text: 'Le voyageur fixe son prix au kilo. Nos frais de service vont de 15 % à 8 % selon le poids.', el: { type: 'priceCard' } },
  `Pas de mauvaise surprise : le voyageur fixe son prix au kilo, Send By Me ajoute des frais de service dégressifs (15 % pour un petit colis, 8 % au-delà de 20 kg), frais bancaires compris. Vous voyez le total avant d’envoyer votre demande.\n${HT}`, 'Instagram, Facebook (feed)');
add(E, 'suivi-post', SQ, 'typo', { bg: 'paper', eyebrow: 'Suivi', title: 'Suivez votre colis, étape par étape.', el: { type: 'timeline', active: 3 } },
  `Accepté, payé, remis au voyageur, en vol, arrivé, livré : chaque étape s’affiche dans votre suivi. Votre destinataire peut aussi suivre le colis avec son numéro.\n${HT}`, 'Instagram, Facebook (feed)');
add(E, 'suivi-story', ST, 'typo', { bg: 'paper', eyebrow: 'Suivi', title: 'Suivez votre colis, étape par étape.', el: { type: 'timeline', active: 4 }, cta: 'send-by-me.com/suivi' }, 'Story : démonstration du suivi.', 'Instagram, Facebook (story)');
add(E, 'domicile-post', SQ, 'photoHero', { photo: P.carton, pos: '60% 40%', eyebrow: 'En option', title: 'Livré jusqu’à la porte.', text: 'Votre destinataire ne peut pas se déplacer ? Choisissez la livraison à domicile.', chips: [['home', 'Livraison à domicile']] },
  `Votre destinataire ne peut pas aller au point de rendez-vous ? Choisissez la livraison à domicile au moment de réserver : un livreur récupère le colis à l’arrivée et l’apporte chez lui.\n${HT}`, 'Instagram, Facebook (feed)');
add(E, 'expediteur-facebook', FB, 'photoHero', { photo: P.remise, pos: '50% 50%', eyebrow: 'Europe ↔ Afrique', title: 'Envoyez un colis à votre famille, sans payer d’avance un inconnu.', cta: 'Envoyer un colis' },
  'Publicité Facebook — Titre : « Envoyez un colis sans payer d’avance un inconnu » · Texte : « Voyageurs vérifiés, paiement bloqué jusqu’à la livraison, code de remise pour votre destinataire. » · Bouton : En savoir plus.', 'Facebook Ads');
add(E, 'expediteur-split', PT, 'split', { photo: P.remise, bg: 'signal', eyebrow: 'Expéditeurs', title: 'Un colis pour la famille ? Quelqu’un part demain.', text: 'Comparez les voyageurs, leurs dates, leurs prix et leurs avis.', cta: 'Trouver un voyageur' },
  `Un colis à envoyer à la famille ? Il y a peut-être quelqu’un qui part demain. Comparez les voyageurs selon leur date, leur prix au kilo et leurs avis.\n${HT}`, 'Instagram (4:5), Facebook');
add(E, 'expediteur-youtube', YT, 'typo', { bg: 'ink', eyebrow: 'Expéditeurs', title: 'Envoyez à la famille, en toute confiance.', text: 'Voyageurs vérifiés, paiement bloqué, code de remise.', el: { type: 'parcel', size: 1.1 }, cta: 'send-by-me.com' }, 'Miniature YouTube / couverture.', 'YouTube, Facebook');

// ─── 04 · Confiance et sécurité ─────────────────────────────────────────────
const CF = '04-confiance';
add(CF, 'identite-post', SQ, 'typo', { bg: 'paper', eyebrow: 'Confiance', title: 'Le badge bleu : identité vérifiée.', text: 'Pièce d’identité et selfie contrôlés. Choisissez des voyageurs vérifiés, avec des avis.', el: { type: 'profileCard' } },
  `Le badge bleu, c’est la garantie que la pièce d’identité et le selfie du membre ont été contrôlés. Le badge doré « Compte certifié » ajoute la vérification de l’adresse.\n${HT}`, 'Instagram, Facebook (feed)');
add(CF, 'code-post', SQ, 'typo', { bg: 'ink', eyebrow: 'Sécurité', title: 'Sans le code, pas de livraison validée.', text: 'Un code à 6 chiffres que seul votre destinataire connaît.', el: { type: 'codeCard' } },
  `Le code de remise, c’est la clé de Send By Me. 6 chiffres, visibles seulement par l’expéditeur, transmis au destinataire. Le voyageur ne peut valider la livraison qu’avec ce code.\n${HT}`, 'Instagram, Facebook (feed)');
add(CF, 'avis-post', SQ, 'typo', { bg: 'signal', eyebrow: 'Confiance', title: 'Des avis que personne ne peut effacer.', text: 'Après chaque envoi, expéditeur et voyageur se notent mutuellement.', el: { type: 'profileCard', name: 'Moussa K.', route: 'Paris → Dakar' } },
  `Après chaque envoi, expéditeur et voyageur se notent mutuellement. Ces avis ne peuvent pas être supprimés : c’est ce qui rend la communauté fiable.\n${HT}`, 'Instagram, Facebook (feed)');
add(CF, 'messagerie-post', SQ, 'photoHero', { photo: P.sofa, pos: '50% 40%', eyebrow: 'Messagerie intégrée', title: 'Discutez avant de confier quoi que ce soit.', text: 'Photos du colis, lieu de rendez-vous… sans donner votre numéro.' },
  `Posez vos questions au voyageur avant de réserver : photos du colis, lieu et heure du rendez-vous. Tout se passe dans la messagerie Send By Me, sans partager votre numéro.\n${HT}`, 'Instagram, Facebook (feed)');
add(CF, 'interdits-post', PT, 'steps', { bg: 'paper', title: 'Ce qui ne voyage pas avec Send By Me', steps: [['ban', 'Argent liquide', 'Jamais dans un colis.'], ['ban', 'Liquides de plus de 100 ml', 'Parfums, huiles, boissons.'], ['ban', 'Produits illicites ou dangereux', 'Refusés, et le compte est suspendu.'], ['check', 'Le reste, présenté ouvert', 'Le voyageur vérifie avant de fermer.']], cta: 'Voir la liste complète' },
  `Liquides de plus de 100 ml, argent liquide, produits illicites : ils ne voyagent pas avec Send By Me. Le voyageur vérifie le colis ouvert avant de le fermer. La liste complète est sur send-by-me.com/objets-interdits.\n${HT}`, 'Instagram (4:5), Facebook');
add(CF, 'securite-story', ST, 'steps', { bg: 'ink', title: '4 protections à chaque envoi', steps: [['badge', 'Identité vérifiée', 'Badge bleu sur le profil.'], ['lock', 'Paiement bloqué', 'Versé seulement après la remise.'], ['key', 'Code de remise', 'Connu de votre destinataire seul.'], ['star', 'Avis croisés', 'Impossibles à supprimer.']], cta: 'send-by-me.com/securite' }, 'Story « À la une » Sécurité.', 'Instagram (story)');
add(CF, 'paiement-hors-plateforme', SQ, 'typo', { bg: 'kraft', eyebrow: 'Bon réflexe', title: 'Payez sur Send By Me, jamais en dehors.', text: 'Un paiement hors plateforme n’est ni protégé ni remboursable.', el: { type: 'codeCard', hidden: true } },
  `Un voyageur vous demande de payer en dehors de Send By Me ? Refusez. Seul le paiement sur la plateforme est bloqué jusqu’à la livraison et remboursable si le colis n’arrive pas.\n${HT}`, 'Instagram, Facebook (feed)');

// ─── 05 · Lignes (corridors) ────────────────────────────────────────────────
const CO = '05-lignes';
const lines = [
  ['paris-douala', ['CDG', 'Paris'], ['DLA', 'Douala'], P.aile, '50% 40%'],
  ['paris-dakar', ['CDG', 'Paris'], ['DSS', 'Dakar'], P.hublot, '50% 45%'],
  ['paris-abidjan', ['CDG', 'Paris'], ['ABJ', 'Abidjan'], P.aero, '50% 35%'],
  ['paris-yaounde', ['CDG', 'Paris'], ['NSI', 'Yaoundé'], P.terminal, '50% 50%'],
  ['bruxelles-kinshasa', ['BRU', 'Bruxelles'], ['FIH', 'Kinshasa'], P.aile, '50% 60%'],
  ['lyon-douala', ['LYS', 'Lyon'], ['DLA', 'Douala'], P.hublot, '50% 30%'],
];
for (const [slug, from, to, ph, pos] of lines) {
  add(CO, `${slug}-post`, SQ, 'corridor', { photo: ph, pos, from, to, text: `Des voyageurs qui partent de ${from[1]} vers ${to[1]} proposent leurs kilos libres. Remise en main propre, paiement libéré avec le code.`, cta: 'Voir les trajets' },
    `${from[1]} → ${to[1]} ✈️ Envoyez vos colis avec des voyageurs qui font le trajet. Paiement bloqué jusqu’à la remise.\n👉 send-by-me.com/envoyer-un-colis/${slug}\n${HT} #${to[1].replace(/\W/g, '')}`, 'Instagram, Facebook, groupes WhatsApp');
  add(CO, `${slug}-story`, ST, 'corridor', { photo: ph, pos, from, to, text: `Envoyez vos colis de ${from[1]} à ${to[1]} avec des voyageurs vérifiés.`, cta: 'Voir les trajets' }, `Story / statut WhatsApp ligne ${from[1]} → ${to[1]}, lien vers la page de la ligne.`, 'Instagram (story), statut WhatsApp');
}

// ─── 06 · Saisons et temps forts ────────────────────────────────────────────
const SA = '06-saisons';
add(SA, 'fin-annee-post', SQ, 'photoHero', { photo: P.famille, pos: '50% 35%', eyebrow: 'Fêtes de fin d’année', title: 'Les cadeaux arrivent avant les fêtes.', text: 'Réservez tôt : les voyageurs de décembre partent vite.', cta: 'Trouver un voyageur' },
  `🎁 Les fêtes approchent ! Envoyez vos cadeaux à la famille avec un voyageur qui rentre en décembre. Réservez tôt, les kilos partent vite.\n${HT} #Noël #FêtesDeFinDAnnée`, 'Instagram, Facebook (feed)');
add(SA, 'fin-annee-story', ST, 'photoHero', { photo: P.famille, pos: '50% 35%', eyebrow: 'Fêtes de fin d’année', title: 'Les cadeaux arrivent avant les fêtes.', cta: 'Envoyer un colis' }, 'Story fin d’année avec lien.', 'Instagram, Facebook (story), statut WhatsApp');
add(SA, 'fin-annee-voyageurs', SQ, 'typo', { bg: 'signal', eyebrow: 'Vous rentrez pour les fêtes ?', title: 'Décembre : vos kilos valent de l’or.', text: 'C’est la période où les familles envoient le plus de colis. Publiez votre trajet dès maintenant.', el: { type: 'ticket', date: 'Sam. 19 déc.', size: 0.85 } },
  `Vous rentrez pour les fêtes ? C’est le moment où les familles envoient le plus de cadeaux. Publiez votre trajet de décembre dès maintenant.\n${HT} #Voyageur`, 'Instagram, Facebook (feed)');
add(SA, 'rentree-post', SQ, 'photoHero', { photo: P.habits, pos: '50% 50%', eyebrow: 'Rentrée scolaire', title: 'Cahiers, cartables, uniformes : ils voyagent aussi.', text: 'Envoyez les fournitures de la rentrée avec un voyageur.', cta: 'Envoyer un colis' },
  `📚 Rentrée scolaire : cahiers, cartables, uniformes… Envoyez les fournitures aux enfants avec un voyageur qui rentre en août.\n${HT} #Rentrée`, 'Instagram, Facebook (feed)');
add(SA, 'ete-post', SQ, 'photoHero', { photo: P.valise, pos: '50% 40%', eyebrow: 'Vacances d’été', title: 'Vous rentrez cet été ? Emportez un peu plus que vos valises.', text: 'Proposez vos kilos libres pour les familles de votre ligne.', cta: 'Proposer mes kilos' },
  `☀️ Vous rentrez cet été ? Proposez vos kilos libres aux familles qui envoient des colis sur votre ligne. Vous fixez votre prix.\n${HT} #Vacances`, 'Instagram, Facebook (feed)');
add(SA, 'fete-meres-post', SQ, 'photoHero', { photo: P.lagos, pos: '50% 30%', eyebrow: 'Fête des mères', title: 'Un cadeau pour maman, remis en main propre.', text: 'Elle reçoit le colis. Elle donne le code. C’est livré.', cta: 'Envoyer un cadeau' },
  `💐 Fête des mères : faites-lui la surprise. Un voyageur remet votre cadeau en main propre, et c’est elle qui valide la livraison avec son code.\n${HT} #FêteDesMères`, 'Instagram, Facebook (feed)');
add(SA, 'fetes-famille-story', ST, 'photoHero', { photo: P.lagos, pos: '50% 30%', eyebrow: 'Temps forts', title: 'Pour chaque fête, un colis qui arrive à temps.', cta: 'send-by-me.com' }, 'Story générique pour les temps forts (fêtes religieuses, mariages, anniversaires).', 'Instagram (story), statut WhatsApp');

// ─── 07 · Parrainage ────────────────────────────────────────────────────────
const PA = '07-parrainage';
add(PA, 'parrainage-post', SQ, 'typo', { bg: 'signal', eyebrow: 'Parrainage', title: '5 € pour vous, 5 € pour eux.', text: 'Invitez vos proches avec votre lien. Chacun reçoit 5 € de crédit après leur première livraison réussie.', chips: [['gift', 'Crédit sur les frais de service']], el: { type: 'creditCard', size: 0.8 } },
  `🎁 Parrainez vos proches : 5 € pour vous, 5 € pour eux. Le crédit s’applique sur les frais de service de vos prochaines réservations. Votre lien est dans Mon espace › Parrainage.\n${HT} #Parrainage`, 'Instagram, Facebook (feed)');
add(PA, 'parrainage-story', ST, 'typo', { bg: 'signal', eyebrow: 'Parrainage', title: '5 € pour vous, 5 € pour eux.', text: 'Partagez votre lien depuis Mon espace.', el: { type: 'creditCard' }, cta: 'Parrainer' }, 'Story parrainage.', 'Instagram (story), statut WhatsApp');
add(PA, 'parrainage-whatsapp', ST, 'photoHero', { photo: P.appel, pos: '50% 25%', eyebrow: 'Entre proches', title: 'Tu envoies des colis au pays ? Essaie Send By Me.', text: '5 € offerts avec mon lien.', cta: 'send-by-me.com' }, 'Statut WhatsApp à partager par les membres (ajouter son lien de parrainage).', 'Statut WhatsApp');

// ─── 08 · Ambassadeurs étudiants ────────────────────────────────────────────
const AM = '08-ambassadeurs';
add(AM, 'ambassadeurs-post', SQ, 'photoHero', { photo: P.lagos, pos: '50% 30%', eyebrow: 'Recrutement', title: 'Deviens ambassadeur Send By Me sur ton campus.', text: 'Fais connaître Send By Me aux étudiants qui rentrent au pays.', cta: 'Écris-nous' },
  `🎓 Étudiant·e en France ou en Belgique ? Deviens ambassadeur Send By Me sur ton campus et fais connaître la plateforme aux étudiants qui rentrent au pays. Écris-nous en message privé.\n${HT} #Étudiants #Ambassadeur`, 'Instagram, Facebook, LinkedIn');
add(AM, 'ambassadeurs-story', ST, 'photoHero', { photo: P.lagos, pos: '50% 30%', eyebrow: 'Recrutement', title: 'Deviens ambassadeur sur ton campus.', cta: 'Écris-nous' }, 'Story recrutement ambassadeurs, sticker « Envoyer un message ».', 'Instagram (story)');
add(AM, 'ambassadeurs-linkedin', LI, 'typo', { bg: 'brand', eyebrow: 'Programme ambassadeurs', title: 'Étudiants de la diaspora : rejoignez l’aventure.', text: 'Associations étudiantes, BDE : parlons partenariat.', chips: [['graduation', 'Campus'], ['users', 'Associations']] },
  `Associations étudiantes africaines, BDE, étudiants de la diaspora : Send By Me lance son programme ambassadeurs. Parlons-en en message privé.\n#Diaspora #Étudiants #Afrique`, 'LinkedIn');

// ─── 09 · Mythes et réalités ────────────────────────────────────────────────
const MY = '09-mythes-realites';
const myths = [
  ['confier', 'Confier un colis à un inconnu, c’est trop risqué.', 'Les voyageurs ont une identité vérifiée et des avis. Et vous discutez avec eux avant de réserver.'],
  ['payer', 'Il faut toujours payer d’avance et croiser les doigts.', 'Votre paiement reste bloqué par Send By Me. Le voyageur n’est payé qu’à la remise, avec le code de votre destinataire.'],
  ['contenu', 'En tant que voyageur, je ne sais jamais ce que je transporte.', 'Le colis vous est présenté ouvert. Vous vérifiez, puis vous le fermez ensemble. Vous pouvez refuser.'],
  ['cher', 'Envoyer un colis en Afrique, c’est forcément cher.', 'Chaque voyageur fixe son prix au kilo. Vous comparez, et vous voyez le total avant de réserver.'],
  ['perdu', 'Si le colis n’arrive pas, l’argent est perdu.', 'Si le colis n’est pas livré, vous êtes remboursé après examen du dossier.'],
];
for (const [slug, myth, fact] of myths) {
  add(MY, `${slug}-post`, SQ, 'myth', { myth, fact }, `On dit : « ${myth} »\nEn vrai : ${fact}\n${HT}`, 'Instagram, Facebook (feed)');
  add(MY, `${slug}-story`, ST, 'myth', { myth, fact }, `Story mythe/réalité « ${slug} » avec sondage « Vous le pensiez aussi ? ».`, 'Instagram (story)');
}

// ─── 10 · Carrousels ────────────────────────────────────────────────────────
const CA = '10-carrousels';
const carousel = (slug, slides, caption) => slides.forEach((s, i) => add(CA, `${slug}-${String(i + 1).padStart(2, '0')}`, PT, 'slide', { ...s, n: i + 1, total: slides.length }, i === 0 ? caption : '', i === 0 ? 'Instagram, Facebook, LinkedIn (carrousel 4:5)' : ''));
carousel('comment-ca-marche', [
  { bg: 'ink', title: 'Envoyer un colis avec un voyageur : comment ça marche ?', text: '4 étapes, et votre argent reste protégé du début à la fin.', el: { type: 'parcel' } },
  { bg: 'paper', kicker: '1', title: 'Trouvez un trajet', text: 'Cherchez votre ville de départ et d’arrivée. Comparez les dates, les prix au kilo et les avis.', photo: P.sofa },
  { bg: 'paper', kicker: '2', title: 'Demandez des kilos', text: 'Décrivez votre colis. Le voyageur accepte ou refuse, et vous pouvez discuter avec lui.', photo: P.carton },
  { bg: 'paper', kicker: '3', title: 'Payez en ligne', text: 'Le montant est bloqué par Send By Me. Le voyageur ne le reçoit pas encore.', el: { type: 'codeCard', hidden: true } },
  { bg: 'paper', kicker: '4', title: 'Remise avec un code', text: 'Votre destinataire donne son code de 6 chiffres au voyageur. Le paiement est alors libéré.', photo: P.remise },
  { bg: 'signal', title: 'Prêt à envoyer votre premier colis ?', text: 'Inscription gratuite.', el: { type: 'parcel' }, cta: 'send-by-me.com' },
], `Envoyer un colis avec un voyageur, comment ça marche ? 👉 Glissez !\n1. Trouvez un trajet\n2. Demandez des kilos\n3. Payez en ligne (montant bloqué)\n4. Remise avec un code\n${HT}`);
carousel('voyageur-5-raisons', [
  { bg: 'signal', title: '5 raisons de proposer vos kilos sur Send By Me', el: { type: 'ticket', size: 0.85 } },
  { bg: 'paper', icon: 'euro', kicker: '1', title: 'C’est gratuit', text: 'Publier un trajet ne coûte rien. Vous fixez votre prix au kilo.' },
  { bg: 'paper', icon: 'lock', kicker: '2', title: 'Vous êtes payé à coup sûr', text: 'L’expéditeur paie avant que vous preniez le colis. Le paiement vous est versé à la remise.' },
  { bg: 'paper', icon: 'check', kicker: '3', title: 'Vous choisissez', text: 'Vous acceptez seulement les colis qui vous conviennent.' },
  { bg: 'paper', kicker: '4', title: 'Vous voyez le contenu', text: 'Le colis vous est présenté ouvert avant de le fermer.', photo: P.habits },
  { bg: 'paper', icon: 'message', kicker: '5', title: 'Pas de coordination sans fin', text: 'Messagerie intégrée, rendez-vous, suivi : tout est au même endroit.' },
  { bg: 'ink', title: 'Votre prochain voyage peut rapporter.', text: 'Publiez votre trajet en deux minutes.', el: { type: 'ticket' }, cta: 'send-by-me.com/publier' },
], `Vous voyagez entre l’Europe et l’Afrique ? Voici 5 raisons de proposer vos kilos libres sur Send By Me. 👉\n${HT} #Voyageur`);
carousel('securite', [
  { bg: 'ink', title: 'Confier un colis à un inconnu ? Oui, mais pas à n’importe qui.', el: { type: 'codeCard' } },
  { bg: 'paper', icon: 'badge', kicker: '1', title: 'Identité vérifiée', text: 'Le badge bleu : pièce d’identité et selfie contrôlés. Le badge doré : adresse vérifiée en plus.' },
  { bg: 'paper', icon: 'lock', kicker: '2', title: 'Paiement bloqué', text: 'Le voyageur est payé seulement après la remise. En cas de problème, vous êtes remboursé.' },
  { bg: 'paper', icon: 'key', kicker: '3', title: 'Code de remise', text: 'Seul votre destinataire connaît le code. Sans lui, la livraison ne peut pas être validée.' },
  { bg: 'paper', icon: 'star', kicker: '4', title: 'Avis croisés', text: 'Expéditeurs et voyageurs se notent. Les avis ne peuvent pas être supprimés.' },
  { bg: 'signal', title: 'Tout savoir sur la sécurité', text: 'Identité, paiement, code, avis : tout est expliqué.', el: { type: 'profileCard' }, cta: 'send-by-me.com/securite' },
], `Comment Send By Me protège vos envois ? 4 protections, à chaque colis. 👉\n${HT}`);

// ─── 11 · Imprimés (flyers A6, affiches A4) ─────────────────────────────────
const PR = '11-imprimes';
add(PR, 'flyer-voyageur-recto', A6, 'flyer', { photo: P.aero, pos: '50% 30%', eyebrow: 'Vous partez bientôt ?', title: 'Vos kilos libres ont de la valeur.', text: 'Proposez la place libre de votre valise. Vous fixez votre prix, vous êtes payé à la remise.', chips: [['euro', 'Gratuit'], ['lock', 'Paiement garanti']] }, 'Flyer A6 voyageur (recto). Impression 105 × 148 mm, 300 dpi.', 'Imprimé');
add(PR, 'flyer-voyageur-verso', A6, 'flyer', { side: 'verso', title: 'Comment ça marche ?', qr: 'publier', qrText: 'Publiez votre trajet', steps: [['plane', 'Publiez votre trajet', 'Villes, date, kilos, prix.'], ['message', 'Recevez des demandes', 'Vous choisissez les colis.'], ['eye', 'Vérifiez le colis', 'Présenté ouvert.'], ['euro', 'Soyez payé', 'Dès la remise, avec le code.']] }, 'Flyer A6 voyageur (verso) avec QR code vers /publier.', 'Imprimé');
add(PR, 'flyer-expediteur-recto', A6, 'flyer', { photo: P.remise, pos: '60% 50%', eyebrow: 'Un colis pour la famille ?', title: 'Plus d’arnaque à l’avance.', text: 'Votre argent reste bloqué jusqu’à ce que votre famille ait le colis en main.', chips: [['badge', 'Voyageurs vérifiés'], ['key', 'Code de remise']] }, 'Flyer A6 expéditeur (recto).', 'Imprimé');
add(PR, 'flyer-expediteur-verso', A6, 'flyer', { side: 'verso', title: 'Comment ça marche ?', qr: 'envoyer', qrText: 'Envoyez votre colis', steps: [['route', 'Trouvez un trajet', 'Ou publiez votre demande.'], ['message', 'Discutez avec le voyageur', 'Avant de réserver.'], ['lock', 'Payez en ligne', 'Montant bloqué.'], ['key', 'Remise avec un code', 'Le paiement est libéré.']] }, 'Flyer A6 expéditeur (verso) avec QR code.', 'Imprimé');
add(PR, 'affiche-a4-voyageur', A4, 'photoHero', { photo: P.aero, pos: '50% 30%', eyebrow: 'Vous partez bientôt ?', title: 'Vos kilos libres ont de la valeur.', text: 'Proposez la place libre de votre valise sur send-by-me.com. Gratuit pour les voyageurs.', chips: [['euro', 'Vous fixez le prix'], ['lock', 'Payé à la remise']], cta: 'send-by-me.com/publier' }, 'Affiche A4 (210 × 297 mm, 300 dpi) pour commerces, associations, campus.', 'Imprimé');
add(PR, 'affiche-a4-expediteur', A4, 'photoHero', { photo: P.remise, pos: '60% 50%', eyebrow: 'Un colis pour la famille ?', title: 'Plus d’arnaque à l’avance.', text: 'Des voyageurs vérifiés. Un paiement bloqué jusqu’à la livraison. Un code que seule votre famille connaît.', chips: [['badge', 'Voyageurs vérifiés'], ['key', 'Code de remise']], cta: 'send-by-me.com' }, 'Affiche A4 expéditeur.', 'Imprimé');

// ─── 12 · Bannières display (Google Ads, sites partenaires) ─────────────────
const BA = '12-bannieres';
const banners = [
  ['300x250', [300, 250]], ['336x280', [336, 280]], ['728x90', [728, 90]], ['970x250', [970, 250]], ['160x600', [160, 600]], ['300x600', [300, 600]], ['320x50', [320, 50]], ['320x100', [320, 100]],
];
for (const [name, size] of banners) {
  add(BA, `expediteur-${name}`, size, 'banner', { photo: P.remise, pos: '60% 50%', title: 'Envoyez un colis sans payer d’avance.', text: 'Paiement bloqué jusqu’à la livraison.', cta: 'Envoyer' }, '', 'Google Display');
  add(BA, `voyageur-${name}`, size, 'banner', { photo: P.aero, pos: '50% 30%', title: 'Vos kilos libres ont de la valeur.', text: 'Gratuit pour les voyageurs.', cta: 'Proposer' }, '', 'Google Display');
}

// ─── 13 · Écrans de l’application ───────────────────────────────────────────
const AP = '13-application';
add(AP, 'appli-accueil-post', SQ, 'phoneAd', { bg: 'brand', screen: 'accueil', eyebrow: 'Sur mobile', title: 'Tout se passe dans votre poche.', text: 'Installez Send By Me sur votre écran d’accueil.', cta: 'send-by-me.com' },
  `Send By Me s’installe sur votre téléphone comme une application : ouvrez send-by-me.com puis « Ajouter à l’écran d’accueil ». Recherche, messagerie, suivi, notifications : tout est dans votre poche.\n${HT}`, 'Instagram, Facebook (feed)');
add(AP, 'appli-accueil-story', ST, 'phoneAd', { bg: 'brand', screen: 'accueil', eyebrow: 'Sur mobile', title: 'Tout se passe dans votre poche.', cta: 'send-by-me.com' }, 'Story : installer l’application (PWA).', 'Instagram (story)');
add(AP, 'appli-ligne-post', PT, 'phoneAd', { bg: 'signal', screen: 'corridor', eyebrow: 'Votre ligne', title: 'Paris → Douala, Dakar, Abidjan…', text: 'Trouvez les voyageurs qui partent sur votre ligne.', cta: 'Voir les lignes' },
  `Paris → Douala, Dakar, Abidjan, Yaoundé, Bruxelles → Kinshasa… Trouvez les voyageurs qui partent sur votre ligne.\n${HT}`, 'Instagram (4:5), Facebook');
add(AP, 'appli-connexion-facebook', FB, 'phoneAd', { bg: 'ink', screen: 'connexion', eyebrow: 'Inscription gratuite', title: 'Créez votre compte en un clic.', text: 'Avec Google, Facebook ou votre e-mail.', cta: 'S’inscrire' },
  'Publicité Facebook — Titre : « Créez votre compte en un clic » · Texte : « Avec Google, Facebook ou votre e-mail. Gratuit. » · Bouton : S’inscrire.', 'Facebook Ads');

// ─── 14 · Conseils pratiques (contenu utile) ─────────────────────────────────
const CS = '14-conseils';
const carousel2 = (slug, slides, caption) => slides.forEach((x, i) => add(CS, `${slug}-${String(i + 1).padStart(2, '0')}`, PT, 'slide', { ...x, n: i + 1, total: slides.length }, i === 0 ? caption : '', i === 0 ? 'Instagram, Facebook (carrousel 4:5)' : ''));
add(CS, 'emballage-post', SQ, 'photoHero', { photo: P.scotch, pos: '50% 50%', eyebrow: 'Conseil', title: 'Un colis bien emballé voyage mieux.', text: 'Carton solide, scotch, étiquette avec le nom du destinataire. Et présentez-le ouvert au voyageur avant de fermer.' },
  `📦 Conseil du jour : un carton solide, du scotch, le nom et le téléphone du destinataire bien visibles. Et n’oubliez pas : le colis est présenté ouvert au voyageur avant d’être fermé.\n${HT} #Conseil`, 'Instagram, Facebook (feed)');
add(CS, 'telephone-post', PT, 'photoHero', { photo: P.mockup, pos: '50% 30%', eyebrow: 'Astuce', title: 'Send By Me s’installe comme une appli.', text: 'Ouvrez send-by-me.com, puis « Ajouter à l’écran d’accueil ». Notifications comprises.', cta: 'send-by-me.com' },
  `📱 Astuce : Send By Me s’installe sur votre téléphone comme une application. Ouvrez send-by-me.com dans votre navigateur, puis « Ajouter à l’écran d’accueil ».\n${HT}`, 'Instagram (4:5), Facebook');
carousel2('conseils-emballage', [
  { bg: 'kraft', title: 'Préparer son colis : 5 conseils', text: 'Pour un envoi sans souci, du départ à la remise.', el: { type: 'parcel', home: false } },
  { bg: 'paper', icon: 'package', kicker: '1', title: 'Un carton solide', text: 'Évitez les sacs plastiques. Un carton fermé protège mieux et rassure le voyageur.' },
  { bg: 'paper', icon: 'eye', kicker: '2', title: 'Présentez-le ouvert', text: 'Le voyageur vérifie le contenu devant vous, puis vous fermez le colis ensemble.' },
  { bg: 'paper', icon: 'ban', kicker: '3', title: 'Vérifiez les objets interdits', text: 'Pas de liquides de plus de 100 ml, pas d’argent liquide, rien d’illicite. La liste est sur le site.' },
  { bg: 'paper', icon: 'pin', kicker: '4', title: 'Notez le destinataire', text: 'Nom et téléphone bien visibles sur le colis, et dans votre réservation.' },
  { bg: 'paper', icon: 'key', kicker: '5', title: 'Transmettez le code', text: 'Envoyez le code de remise à votre destinataire, jamais au voyageur.' },
  { bg: 'ink', title: 'Prêt ? Trouvez votre voyageur.', el: { type: 'codeCard', hidden: true }, cta: 'send-by-me.com' },
], `📦 5 conseils pour préparer votre colis avant de le confier à un voyageur. Enregistrez ce post pour votre prochain envoi !\n${HT} #Conseils`);
carousel2('conseils-voyageur', [
  { bg: 'signal', title: 'Voyageurs : 5 réflexes pour transporter un colis', el: { type: 'ticket', size: 0.85 } },
  { bg: 'paper', icon: 'eye', kicker: '1', title: 'Ouvrez, vérifiez, refermez', text: 'Vous avez le droit de voir le contenu, et de refuser.' },
  { bg: 'paper', icon: 'suitcase', kicker: '2', title: 'Pesez avant de partir', text: 'Respectez la franchise de votre billet : les kilos en trop se paient à l’aéroport.' },
  { bg: 'paper', icon: 'message', kicker: '3', title: 'Restez dans la messagerie', text: 'Rendez-vous, photos, questions : tout reste écrit sur Send By Me.' },
  { bg: 'paper', icon: 'key', kicker: '4', title: 'Demandez le code à la remise', text: 'Sans le code du destinataire, la livraison ne peut pas être validée.' },
  { bg: 'paper', icon: 'star', kicker: '5', title: 'Laissez un avis', text: 'Les avis construisent votre réputation et vous apportent plus de demandes.' },
  { bg: 'ink', title: 'Votre prochain trajet ?', text: 'Publiez-le gratuitement.', el: { type: 'ticket' }, cta: 'send-by-me.com/publier' },
], `✈️ Voyageurs : 5 réflexes pour transporter un colis en toute sérénité. À enregistrer !\n${HT} #Voyageur`);

module.exports = { S };
