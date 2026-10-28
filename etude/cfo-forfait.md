# Unit economics: Send By Me — modèle actuel + forfait sécurité et suivi de 2 € (envoi moyen de 8 kg à 9 €/kg)

Every number below comes from the input file. Nothing is looked up or guessed.

## One envoi payé

| line | per envoi payé |
| --- | ---: |
| Price | $11.09 |
| Parrainage : 5 € de crédit sur ~20 % des envois (estimation) | -$1.00 |
| Notifications SMS et e-mails, ~4 SMS (tarif Brevo ~0,045 €/SMS) | -$0.20 |
| Vérification d'identité, ramenée à l'envoi (estimation) | -$0.30 |
| Litiges et remboursements non récupérés, ~1 % du volume (estimation) | -$0.80 |
| Virement au voyageur (Stripe Connect, estimation) | -$0.50 |
| **Contribution** (what each envoi payé leaves to pay the fixed costs) | **$8.29** (75%) |

## The margin that matters

Fixed costs: $4,750 a month (Support et opérations (freelance mi-temps, estimation) $1,200, Hébergement et outils : Supabase Pro, Netlify Pro, Brevo, Google Workspace, domaine (estimation) $150, Expert-comptable (estimation) $150, Assurances : RC pro plateforme et garantie colis (estimation à confirmer par devis) $200, Banque, outils divers (estimation) $50, Publicité permanente : Meta, TikTok, Google (budget choisi) $3,000).

- **Break-even: 20 envoi payés a day.** Below that you lose money every month.
- **Profit margin at your plan** (30 a day): **27%** of every sale, after every cost.
- Capacity: 10000 a day.

## Year 1, month by month

| month | envoi payés a day | revenue | profit | cumulative (after $12,600 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | $333 | -$4,501 | -$17,101 |
| 2 | 2 | $665 | -$4,253 | -$21,354 |
| 3 | 3 | $998 | -$4,004 | -$25,358 |
| 4 | 4 | $1,331 | -$3,755 | -$29,113 |
| 5 | 6 | $1,996 | -$3,258 | -$32,371 |
| 6 | 9 | $2,994 | -$2,512 | -$34,882 |
| 7 | 14 | $4,658 | -$1,268 | -$36,151 |
| 8 | 12 | $3,992 | -$1,766 | -$37,916 |
| 9 | 10 | $3,327 | -$2,263 | -$40,179 |
| 10 | 12 | $3,992 | -$1,766 | -$41,945 |
| 11 | 16 | $5,323 | -$771 | -$42,716 |
| 12 | 22 | $7,319 | $721 | -$41,994 |

- **Year 1 operating profit: -$29,394** on $36,930 of revenue.
- After the $12,600 startup spend: -$41,994.
- Startup money earned back: not within year 1.
- Cash you need before it pays for itself: **$42,716**.

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 27% | 20 | -$29,394 |
| Price -10% | 19% | 23 | -$33,087 |
| Volume -20% | 15% | 20 | -$34,915 |
| Unit costs +15% | 23% | 21 | -$30,793 |

## Red flags

- Year 1 loses money on operations (-$29,394).
- The startup spend is not earned back within year 1.
