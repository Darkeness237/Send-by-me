# Unit economics: Send By Me — modèle actuel (commission 12 % sur un envoi moyen de 8 kg à 9 €/kg) — publicité 500 €/mois

Every number below comes from the input file. Nothing is looked up or guessed.

## One envoi payé

| line | per envoi payé |
| --- | ---: |
| Price | $9.09 |
| Parrainage : 5 € de crédit sur ~20 % des envois (estimation) | -$1.00 |
| Notifications SMS et e-mails, ~4 SMS (tarif Brevo ~0,045 €/SMS) | -$0.20 |
| Vérification d'identité, ramenée à l'envoi (estimation) | -$0.30 |
| Litiges et remboursements non récupérés, ~1 % du volume (estimation) | -$0.80 |
| Virement au voyageur (Stripe Connect, estimation) | -$0.50 |
| **Contribution** (what each envoi payé leaves to pay the fixed costs) | **$6.29** (69%) |

## The margin that matters

Fixed costs: $2,250 a month (Support et opérations (freelance mi-temps, estimation) $1,200, Hébergement et outils : Supabase Pro, Netlify Pro, Brevo, Google Workspace, domaine (estimation) $150, Expert-comptable (estimation) $150, Assurances : RC pro plateforme et garantie colis (estimation à confirmer par devis) $200, Banque, outils divers (estimation) $50, Publicité permanente : Meta et Google (budget plafonné) $500).

- **Break-even: 12 envoi payés a day.** Below that you lose money every month.
- **Profit margin at your plan** (30 a day): **42%** of every sale, after every cost.
- Capacity: 10000 a day.

## Year 1, month by month

| month | envoi payés a day | revenue | profit | cumulative (after $8,600 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | $273 | -$2,061 | -$10,661 |
| 2 | 2 | $545 | -$1,873 | -$12,534 |
| 3 | 3 | $818 | -$1,684 | -$14,218 |
| 4 | 4 | $1,091 | -$1,495 | -$15,713 |
| 5 | 6 | $1,636 | -$1,118 | -$16,831 |
| 6 | 9 | $2,454 | -$552 | -$17,382 |
| 7 | 14 | $3,818 | $392 | -$16,991 |
| 8 | 12 | $3,272 | $14 | -$16,976 |
| 9 | 10 | $2,727 | -$363 | -$17,339 |
| 10 | 12 | $3,272 | $14 | -$17,325 |
| 11 | 16 | $4,363 | $769 | -$16,556 |
| 12 | 22 | $5,999 | $1,901 | -$14,654 |

- **Year 1 operating profit: -$6,054** on $30,270 of revenue.
- After the $8,600 startup spend: -$14,654.
- Startup money earned back: not within year 1.
- Cash you need before it pays for itself: **$17,382**.

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 42% | 12 | -$6,054 |
| Price -10% | 35% | 14 | -$9,081 |
| Volume -20% | 35% | 12 | -$10,243 |
| Unit costs +15% | 37% | 13 | -$7,453 |

## Red flags

- Year 1 loses money on operations (-$6,054).
- The startup spend is not earned back within year 1.
