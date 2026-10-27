# Plan marketing de lancement — Send By Me

> Campagne « Kilos libres », 90 jours. Les chiffres cibles sont des **hypothèses de départ**, à recaler après les deux premières semaines de données réelles.

## 1. Vue d'ensemble

- **Nom de campagne :** Kilos libres
- **En une phrase :** faire de Send By Me le réflexe sûr pour confier un colis à un voyageur entre Paris et Douala, Dakar ou Abidjan.
- **Objectif principal (SMART) :** en 90 jours, atteindre la **liquidité** sur 3 corridors pilotes, c'est-à-dire au moins **2 trajets publiés par semaine et par corridor** et **60 envois livrés** au total.
- **Objectifs secondaires :**
  - 150 voyageurs inscrits, dont 50 avec identité vérifiée
  - 40 % des expéditeurs qui renvoient un colis dans les 60 jours
  - Note moyenne ≥ 4,6 sur les avis

**Principe clé : l'offre d'abord.** Une place de marché vide ne convertit pas. Les 4 premières semaines sont consacrées aux voyageurs. Un expéditeur qui ne trouve aucun trajet ne revient pas.

## 2. Audiences

### Voyageurs (offre), à recruter en priorité
> Membre de la diaspora, étudiant ou professionnel, qui rentre au pays 2 à 6 fois par an avec 10 à 23 kg libres. Il transporte déjà des colis pour des proches, souvent sans être payé ni protégé. Il découvre les services via WhatsApp, Facebook et le bouche-à-oreille. Il tient à sa sécurité (douanes, contenu douteux) et au fait d'être payé à coup sûr.

- **Freins :** peur de transporter un objet illicite, impayés, temps perdu en coordination.
- **Réponses produit :** contrôle du colis ouvert, paiement bloqué avant la remise, messagerie intégrée.

### Expéditeurs (demande)
> Personne de la diaspora en France ou en Belgique qui envoie régulièrement vêtements, médicaments sur ordonnance, fournitures scolaires et électronique à sa famille. Elle utilise aujourd'hui des « GP » trouvés dans des groupes WhatsApp et Facebook, ou des transporteurs chers et lents.

- **Freins :** perte ou vol du colis, arnaques à l'avance de paiement, manque de visibilité.
- **Moments forts :** rentrée scolaire (août-septembre), fêtes de fin d'année (novembre-décembre), Tabaski et Ramadan, vacances d'été.

### Où les trouver
- Groupes WhatsApp et Facebook « GP Paris–Dakar », « colis Paris–Douala » et similaires
- Associations étudiantes africaines (universités d'Île-de-France, Lyon, Lille)
- Églises, mosquées et associations communautaires
- Commerces : épiceries africaines, salons de coiffure, transferts d'argent (Château-Rouge, Château-d'Eau, Saint-Denis, Matonge à Bruxelles)
- TikTok et Instagram : créateurs de la diaspora, vlogs « je rentre au pays »

## 3. Messages

**Message central :** *Vos colis voyagent dans la valise de quelqu'un, et le voyageur n'est payé que quand votre famille l'a en main.*

| Pour qui | Message | Preuve dans le produit |
|---|---|---|
| Expéditeur | Plus d'arnaque à l'avance : l'argent est bloqué jusqu'à la livraison. | Paiement Stripe, libéré uniquement avec le code de remise |
| Expéditeur | C'est votre destinataire qui valide la livraison. | Code à 6 chiffres, visible seulement par l'expéditeur |
| Voyageur | Rentabilisez vos kilos sans courir après l'argent. | Paiement garanti avant la prise en charge du colis |
| Voyageur | Vous voyez ce que vous transportez. | Colis présenté ouvert, droit de refus, liste d'objets interdits |
| Les deux | Choisissez à qui vous avez affaire. | Badge d'identité vérifiée et avis croisés impossibles à supprimer |

**Ton :** direct, chaleureux, sans jargon. On parle de « kilos » et de « colis pour la famille », pas de « logistique collaborative ». Les variantes en wolof, lingala, pidgin et nouchi sont à tester sur les réseaux sociaux.

## 4. Canaux

| Canal | Pourquoi | Format | Effort | Budget (sur 3 000 €) |
|---|---|---|---|---|
| **Groupes WhatsApp et Facebook** | C'est là qu'est le marché aujourd'hui | Annonces de trajets réels, lien vers la page corridor | Moyen | 0 € |
| **Parrainage voyageurs** | La confiance passe par les proches | 10 € offerts au voyageur pour chaque premier envoi livré par un filleul | Faible | 900 € |
| **Ambassadeurs étudiants** | Voyageurs fréquents, réseaux denses | 1 ambassadeur par grande université, rémunéré par trajet recruté | Moyen | 600 € |
| **TikTok et Instagram** | Notoriété auprès des 18-35 ans de la diaspora | Vidéos « J'ai payé mon billet avec mes kilos », démonstration du code de remise | Moyen | 500 € (boost) |
| **SEO** | Requêtes à forte intention : « envoyer colis Paris Douala » | Pages corridors (déjà en ligne), guides douane par pays | Moyen | 0 € |
| **Terrain** | Commerces de quartier | Flyers et QR code vers `/publier` et `/recherche` | Faible | 300 € |
| **Google Ads** | Captation de l'intention, après la liquidité seulement | Mots-clés corridors, à partir de la semaine 6 | Moyen | 400 € |
| Réserve | Opportunités et tests | — | — | 300 € |

## 5. Calendrier

| Semaine | Contenu | Canal | Notes | Statut |
|---|---|---|---|---|
| S-1 | Brancher Supabase et Stripe en production, faire relire les CGU | Produit | **Bloquant** pour tout le reste | À faire |
| S1 | Recruter 20 voyageurs fondateurs dans l'entourage, vérifier leurs identités à la main | Direct | Objectif : trajets visibles dès le lancement | À faire |
| S1 | Créer les comptes TikTok, Instagram et WhatsApp Business | Social | Logo et charte déjà prêts | À faire |
| S2 | Kit ambassadeur (pitch, visuels, lien de parrainage) et recrutement de 5 ambassadeurs | Étudiants | | À faire |
| S2-S4 | 3 vidéos par semaine côté voyageur : « combien j'ai gagné », « comment je contrôle un colis » | TikTok/IG | Tourner avec les voyageurs fondateurs | À faire |
| S3 | Publier les trajets réels dans 30 groupes WhatsApp et Facebook | Communautés | Respecter les règles des groupes, pas de spam | À faire |
| S4 | Ouverture côté expéditeurs : flyers dans 40 commerces | Terrain | Seulement si chaque corridor a ≥ 2 trajets par semaine | À faire |
| S5 | Guides SEO : « Envoyer des médicaments au Cameroun », « Douane Sénégal : ce qu'on peut apporter » | Blog | | À faire |
| S6 | Lancement de Google Ads sur les 3 corridors | Payant | Conditionné à la liquidité | À faire |
| S6-S8 | Collecter de vrais témoignages, avec accord écrit | Social, site | Remplace les exemples génériques | À faire |
| S8 | Campagne « Colis de fin d'année » | Tous | Pic saisonnier novembre-décembre | À faire |
| S10-S12 | Bilan : extension à Bruxelles–Kinshasa et Lyon–Douala si les objectifs sont atteints | — | | À faire |

## 6. Contenus à produire

**Indispensables**
- Kit voyageur : visuel « Rentabilisez vos kilos » et vidéo de 30 s montrant le code de remise
- Kit expéditeur : visuel « Plus d'arnaque à l'avance » et explication du paiement bloqué
- Flyer A6 recto-verso avec QR codes
- 3 messages types pour les groupes WhatsApp (voyageur, expéditeur, trajet du jour)
- E-mails transactionnels : demande reçue, demande acceptée, paiement confirmé, rappel du code, demande d'avis

**Optionnels**
- Guides douane par pays (SEO)
- Programme ambassadeur avec un tableau de suivi
- Vidéo témoignage d'un voyageur fondateur

## 7. Indicateurs

| Indicateur | Cible à 90 jours | Mesure |
|---|---|---|
| **Envois livrés** (principal) | 60 | `bookings.status = 'delivered'` |
| Trajets publiés par semaine et par corridor | ≥ 2 | `trips` groupés par corridor et par semaine |
| Taux d'acceptation des demandes | ≥ 60 % | `accepted` ÷ (`accepted` + `declined`) |
| Taux de paiement après acceptation | ≥ 70 % | `paid` ÷ `accepted` |
| Expéditeurs récurrents | ≥ 40 % | Expéditeurs ayant ≥ 2 envois livrés |
| Note moyenne | ≥ 4,6 | Vue `profile_ratings` |

Suivi chaque semaine avec une requête SQL sur Supabase. Un tableau de bord peut être ajouté ensuite.

## 8. Risques

| Risque | Parade |
|---|---|
| Pas assez de voyageurs : les expéditeurs repartent déçus | Ne pas ouvrir la demande tant que l'offre est insuffisante, et proposer une alerte e-mail « Prévenez-moi quand un trajet est publié » |
| Contenu illicite ou ennuis à la douane | Contrôle du colis ouvert, liste d'objets interdits, déclaration cochée à chaque réservation, suspension des comptes signalés |
| Transactions conclues hors plateforme après le premier contact | Garder la valeur dans l'app (protection, avis, code de remise) et rappeler qu'un paiement hors plateforme n'est pas protégé |
| Promesses non tenues | Ne publier que de vrais chiffres et de vrais témoignages, avec accord écrit |

## 9. Prochaines étapes

1. Créer le projet Supabase de production et le compte Stripe (voir `README.md`)
2. Faire valider les CGU et la politique de confidentialité par un juriste
3. Dresser la liste des 20 voyageurs fondateurs
4. Choisir le domaine (`sendbyme.app` est utilisé dans le site, à vérifier) et créer les comptes sociaux
5. Décider du budget réel pour recaler le tableau des canaux
