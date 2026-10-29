# Send By Me

Plateforme d'envoi de colis entre particuliers : des voyageurs proposent leurs kilos libres entre l'Europe et l'Afrique francophone, des expéditeurs les réservent. Le paiement reste bloqué jusqu'à ce que le destinataire donne son **code de remise** au voyageur.

## Stack

| Couche | Choix |
|---|---|
| Front et serveur | Next.js 16 (App Router, Server Actions, Cache Components), React 19, TypeScript |
| Style | Tailwind CSS 4, police Archivo, design system dans `src/app/globals.css` |
| Données et comptes | Supabase (Postgres + Auth), RLS sur toutes les tables |
| Paiement | Stripe Checkout + webhook signé |

## Démarrer en local

```bash
npm install
npm run db:start        # Supabase local (Docker) : applique supabase/migrations
cp .env.example .env.local
# remplir .env.local avec les valeurs affichées par `npx supabase status`
npm run dev             # http://localhost:3000
```

Sans variables Supabase, le site tourne en **mode démo** : trajets d'exemple, comptes et réservations désactivés.

## Parcours

1. Le voyageur publie un trajet (`/publier`).
2. L'expéditeur trouve le trajet (`/recherche`, `/envoyer-un-colis/paris-douala`…) et envoie une demande. **Le prix est recalculé côté serveur.**
3. Le voyageur accepte. La capacité est réservée de façon atomique (`accept_booking`).
4. L'expéditeur paie via Stripe Checkout. **Seul le webhook** marque la réservation comme payée, après vérification de la signature et du montant, puis génère le code de remise.
5. Le voyageur confirme la prise en charge, puis saisit le code donné par le destinataire (5 essais maximum, comparaison en temps constant).
6. Chacun laisse un avis. Le versement au voyageur passe alors « à verser » dans la console admin.

Autres fonctions : **appels audio et vidéo** dans la conversation (WebRTC, numéros jamais partagés), **application installable** (PWA, page hors ligne), profil modifiable, mot de passe oublié, lignes suivies (« prévenez-moi des nouveaux trajets », affichées dans l'espace perso), annulation de trajet, signalement d'un problème, messagerie et statut en temps réel.

## Administration (`/admin`)

Signalements à traiter, versements à effectuer (avec référence du virement), vérification d'identité des membres et remboursements Stripe (les kilos sont libérés automatiquement).

Pour donner le rôle admin à un compte (via SQL, jamais depuis l'app) :

```sql
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
where email = 'vous@exemple.fr';
```

Le rôle est lu dans `app_metadata` (non modifiable par l'utilisateur). Il prend effet à la prochaine connexion.

## Appels dans la messagerie

Appels de navigateur à navigateur (WebRTC). La signalisation passe par un canal Supabase Realtime **privé** `call:<réservation>` : la RLS sur `realtime.messages` n'y admet que l'expéditeur et le voyageur. Dans Supabase > Realtime > Settings, désactivez « Allow public access » en production.

Sans relais, la plupart des appels passent (STUN). Pour les réseaux mobiles stricts, ajoutez un serveur TURN : variables `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` (Twilio Network Traversal, Cloudflare Calls TURN ou coturn). Les identifiants ne sont remis qu'aux participants.

## Sécurité

- **RLS** activée sur toutes les tables. Les lectures passent par la session de l'utilisateur.
- **Aucune écriture directe** sur les réservations, les avis ou les codes depuis le navigateur. Les transitions passent par des Server Actions qui vérifient l'identité (`getClaims`) et le rôle avant d'utiliser la clé secrète.
- Les **droits par colonne** empêchent un utilisateur de modifier `id_verified`, `reserved_kg` ou un statut.
- Le **code de remise** est stocké dans `booking_secrets`, lisible uniquement par l'expéditeur.
- Les **redirections** après connexion n'acceptent que des chemins internes.
- **Tests :** `tests/rls.sql` (droits SQL), `tests/e2e.cjs` (parcours complet, webhook falsifié, mauvais code, accès d'un tiers) `tests/e2e-v2.cjs` (temps réel, signalement, alertes, annulation, console admin) et `tests/e2e-calls.cjs` (appel, refus, raccrochage).

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f tests/rls.sql
npm run db:advisors
```

## Mise en production

**Environnements actuels :** Supabase `send-by-me` (réf. `wkavdtthbxwddvpeyazt`, Paris `eu-west-3`, migrations appliquées) et Netlify `send-by-me-demo`.

1. **Supabase** : créer un projet, puis `npx supabase link` et `npx supabase db push`. Dans Auth > URL Configuration, déclarer l'URL du site et `/auth/confirm`.
2. **Stripe** : utiliser un *sandbox* pour les tests et une clé restreinte (`rk_…`). Créer un endpoint webhook vers `https://<domaine>/api/webhooks/stripe` avec les événements `checkout.session.completed`, `checkout.session.async_payment_succeeded` et `checkout.session.async_payment_failed`. **Le webhook est obligatoire** : sans lui, aucune réservation ne passe en « payée ».
3. **Hébergement** : Netlify (`netlify.toml` fourni, Next.js détecté automatiquement). Renseigner les variables de `.env.example` dans Netlify > Project configuration > Environment variables, puis redéployer.
4. **Mesure d'audience (Plausible)** : ajouter le site `send-by-me.com` dans Plausible, puis créer les objectifs (Goals > Custom event) `Inscription`, `Trajet publié`, `Demande publiée`, `Paiement lancé` et `Livraison confirmée`, et la propriété personnalisée `corridor` (et `methode` pour les inscriptions). Le script n'est chargé qu'en production et n'utilise pas de cookie ; les adresses de pages sont envoyées sans identifiant ni paramètre (`src/lib/analytics.ts`).
5. **Suivi des erreurs (Sentry)** : créer un projet Next.js dans Sentry (région UE de préférence), puis renseigner dans Netlify :
   - `NEXT_PUBLIC_SENTRY_DSN` : DSN du projet (sans lui, Sentry reste désactivé) ;
   - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` : envoi des sourcemaps pendant le build, supprimées ensuite du site publié.
   Les e-mails, téléphones, IBAN et codes de remise sont filtrés avant envoi (`src/lib/sentry-scrub.ts`), `sendDefaultPii` est désactivé et Session Replay n'est pas utilisé.
6. Faire relire `/cgu` et `/confidentialite` par un juriste.

## Feuille de route

- **Versement aux voyageurs** : Stripe Connect (Accounts v2, charges et transferts séparés). Aujourd'hui, l'argent est encaissé par la plateforme et le versement se fait à la main.
- Vérification d'identité automatisée (KYC). Aujourd'hui, l'équipe contrôle la pièce reçue par e-mail et coche « vérifié » dans `/admin`.
- Mobile Money (Orange Money, MTN MoMo) pour les départs d'Afrique
- E-mails transactionnels (demande reçue, paiement, rappel du code, nouveaux trajets sur une ligne suivie)

## Marketing

Le plan de lancement sur 90 jours est dans [`docs/MARKETING.md`](docs/MARKETING.md).
