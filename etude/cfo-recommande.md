# Unit economics: Send By Me — modèle recommandé (marge fixe 2,50 €/kg + 2 € de frais de dossier, envoi moyen de 8 kg)

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

Fixed costs: $4,750 a month (Support et opérations (freelance mi-temps, estimation) $1,200, Hébergement et outils : Supabase Pro, Netlify Pro, Brevo, Google Workspace, domaine (estimation) $150, Expert-comptable (estimation) $150, Assurances : RC pro plateforme et garantie colis (estimation à confirmer par devis) $200, Banque, outils divers (estimation) $50, Publicité permanente : Meta, TikTok, Google (budget choisi) $3,000).

- **Break-even: 9 envoi payés a day.** Below that you lose money every month.
- **Profit margin at your plan** (30 a day): **64%** of every sale, after every cost.
- Capacity: 10000 a day.

## Year 1, month by month

| month | envoi payés a day | revenue | profit | cumulative (after $12,600 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | $674 | -$4,160 | -$16,760 |
| 2 | 2 | $1,347 | -$3,571 | -$20,332 |
| 3 | 3 | $2,020 | -$2,982 | -$23,313 |
| 4 | 4 | $2,694 | -$2,392 | -$25,705 |
| 5 | 6 | $4,041 | -$1,213 | -$26,918 |
| 6 | 9 | $6,062 | $556 | -$26,362 |
| 7 | 14 | $9,429 | $3,503 | -$22,860 |
| 8 | 12 | $8,082 | $2,324 | -$20,536 |
| 9 | 10 | $6,735 | $1,145 | -$19,390 |
| 10 | 12 | $8,082 | $2,324 | -$17,066 |
| 11 | 16 | $10,776 | $4,682 | -$12,384 |
| 12 | 22 | $14,817 | $8,219 | -$4,166 |

- **Year 1 operating profit: $8,434** on $74,758 of revenue.
- After the $12,600 startup spend: -$4,166.
- Startup money earned back: not within year 1.
- Cash you need before it pays for itself: **$26,918**.

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 64% | 9 | $8,434 |
| Price -10% | 60% | 10 | $959 |
| Volume -20% | 58% | 9 | -$4,652 |
| Unit costs +15% | 62% | 9 | $7,036 |

## Red flags

- The startup spend is not earned back within year 1.
