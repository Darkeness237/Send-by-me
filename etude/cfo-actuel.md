# Unit economics: Send By Me — modèle actuel (commission 12 % sur un envoi moyen de 8 kg à 9 €/kg)

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

Fixed costs: $4,750 a month (Support et opérations (freelance mi-temps, estimation) $1,200, Hébergement et outils : Supabase Pro, Netlify Pro, Brevo, Google Workspace, domaine (estimation) $150, Expert-comptable (estimation) $150, Assurances : RC pro plateforme et garantie colis (estimation à confirmer par devis) $200, Banque, outils divers (estimation) $50, Publicité permanente : Meta, TikTok, Google (budget choisi) $3,000).

- **Break-even: 26 envoi payés a day.** Below that you lose money every month.
- **Profit margin at your plan** (30 a day): **11%** of every sale, after every cost.
- Capacity: 10000 a day.

## Year 1, month by month

| month | envoi payés a day | revenue | profit | cumulative (after $12,600 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | $273 | -$4,561 | -$17,161 |
| 2 | 2 | $545 | -$4,373 | -$21,534 |
| 3 | 3 | $818 | -$4,184 | -$25,718 |
| 4 | 4 | $1,091 | -$3,995 | -$29,713 |
| 5 | 6 | $1,636 | -$3,618 | -$33,331 |
| 6 | 9 | $2,454 | -$3,052 | -$36,382 |
| 7 | 14 | $3,818 | -$2,108 | -$38,491 |
| 8 | 12 | $3,272 | -$2,486 | -$40,976 |
| 9 | 10 | $2,727 | -$2,863 | -$43,839 |
| 10 | 12 | $3,272 | -$2,486 | -$46,325 |
| 11 | 16 | $4,363 | -$1,731 | -$48,056 |
| 12 | 22 | $5,999 | -$599 | -$48,654 |

- **Year 1 operating profit: -$36,054** on $30,270 of revenue.
- After the $12,600 startup spend: -$48,654.
- Startup money earned back: not within year 1.
- Cash you need before it pays for itself: **$48,654**.

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 11% | 26 | -$36,054 |
| Price -10% | 1% | 30 | -$39,081 |
| Volume -20% | -3% | 26 | -$40,243 |
| Unit costs +15% | 7% | 27 | -$37,453 |

## Red flags

- Year 1 loses money on operations (-$36,054).
- The startup spend is not earned back within year 1.
