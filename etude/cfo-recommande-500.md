# Unit economics: Send By Me — modèle recommandé (marge fixe 2,50 €/kg + 2 € de frais de dossier, envoi moyen de 8 kg) — publicité 500 €/mois

Every number below comes from the input file. Nothing is looked up or guessed.

## One envoi payé

| line | per envoi payé |
| --- | ---: |
| Price | $22.45 |
| Parrainage : 5 € de crédit sur ~20 % des envois (estimation) | -$1.00 |
| Notifications SMS et e-mails, ~4 SMS (tarif Brevo ~0,045 €/SMS) | -$0.20 |
| Vérification d'identité, ramenée à l'envoi (estimation) | -$0.30 |
| Litiges et remboursements non récupérés, ~1 % du volume (estimation) | -$0.80 |
| Virement au voyageur (Stripe Connect, estimation) | -$0.50 |
| **Contribution** (what each envoi payé leaves to pay the fixed costs) | **$19.65** (88%) |

## The margin that matters

Fixed costs: $2,250 a month (Support et opérations (freelance mi-temps, estimation) $1,200, Hébergement et outils : Supabase Pro, Netlify Pro, Brevo, Google Workspace, domaine (estimation) $150, Expert-comptable (estimation) $150, Assurances : RC pro plateforme et garantie colis (estimation à confirmer par devis) $200, Banque, outils divers (estimation) $50, Publicité permanente : Meta et Google (budget plafonné) $500).

- **Break-even: 4 envoi payés a day.** Below that you lose money every month.
- **Profit margin at your plan** (30 a day): **76%** of every sale, after every cost.
- Capacity: 10000 a day.

## Year 1, month by month

| month | envoi payés a day | revenue | profit | cumulative (after $8,600 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | $674 | -$1,660 | -$10,260 |
| 2 | 2 | $1,347 | -$1,071 | -$11,332 |
| 3 | 3 | $2,020 | -$482 | -$11,813 |
| 4 | 4 | $2,694 | $108 | -$11,705 |
| 5 | 6 | $4,041 | $1,287 | -$10,418 |
| 6 | 9 | $6,062 | $3,056 | -$7,362 |
| 7 | 14 | $9,429 | $6,003 | -$1,360 |
| 8 | 12 | $8,082 | $4,824 | $3,464 |
| 9 | 10 | $6,735 | $3,645 | $7,110 |
| 10 | 12 | $8,082 | $4,824 | $11,934 |
| 11 | 16 | $10,776 | $7,182 | $19,116 |
| 12 | 22 | $14,817 | $10,719 | $29,834 |

- **Year 1 operating profit: $38,434** on $74,758 of revenue.
- After the $8,600 startup spend: $29,834.
- Startup money earned back: month 8.
- Cash you need before it pays for itself: **$11,813**.

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 76% | 4 | $38,434 |
| Price -10% | 74% | 5 | $30,959 |
| Volume -20% | 74% | 4 | $25,348 |
| Unit costs +15% | 75% | 4 | $37,036 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.
