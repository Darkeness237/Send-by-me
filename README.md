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
6. Chacun laisse un avis.

## Sécurité

- **RLS** activée sur toutes les tables. Les lectures passent par la session de l'utilisateur.
- **Aucune écriture directe** sur les réservations, les avis ou les codes depuis le navigateur. Les transitions passent par des Server Actions qui vérifient l'identité (`getClaims`) et le rôle avant d'utiliser la clé secrète.
- Les **droits par colonne** empêchent un utilisateur de modifier `id_verified`, `reserved_kg` ou un statut.
- Le **code de remise** est stocké dans `booking_secrets`, lisible uniquement par l'expéditeur.
- Les **redirections** après connexion n'acceptent que des chemins internes.
- **Tests :** `tests/rls.sql` (droits SQL) et `tests/e2e.cjs` (parcours complet, webhook falsifié, mauvais code, accès d'un tiers).

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f tests/rls.sql
npm run db:advisors
```

## Mise en production

1. **Supabase** : créer un projet, puis `npx supabase link` et `npx supabase db push`. Dans Auth > URL Configuration, déclarer l'URL du site et `/auth/confirm`.
2. **Stripe** : utiliser un *sandbox* pour les tests et une clé restreinte (`rk_…`). Créer un endpoint webhook vers `https://<domaine>/api/webhooks/stripe` avec les événements `checkout.session.completed`, `checkout.session.async_payment_succeeded` et `checkout.session.async_payment_failed`. **Le webhook est obligatoire** : sans lui, aucune réservation ne passe en « payée ».
3. **Hébergement** : Vercel ou Netlify, avec les variables de `.env.example`.
4. Faire relire `/cgu` et `/confidentialite` par un juriste.

## Feuille de route

- **Versement aux voyageurs** : Stripe Connect (Accounts v2, charges et transferts séparés). Aujourd'hui, l'argent est encaissé par la plateforme et le versement se fait à la main.
- Remboursements et litiges depuis une console d'administration
- Vérification d'identité (KYC) dans l'app. Aujourd'hui, `id_verified` est activé à la main par l'équipe.
- Mobile Money (Orange Money, MTN MoMo) pour les départs d'Afrique
- E-mails transactionnels, alertes « nouveau trajet sur ma ligne », messagerie en temps réel

## Marketing

Le plan de lancement sur 90 jours est dans [`docs/MARKETING.md`](docs/MARKETING.md).
