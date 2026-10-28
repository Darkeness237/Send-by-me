# Unit economics: Send By Me — modèle actuel + forfait sécurité et suivi de 2 € (envoi moyen de 8 kg à 9 €/kg) — publicité 500 €/mois

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

Fixed costs: $2,250 a month (Support et opérations (freelance mi-temps, estimation) $1,200, Hébergement et outils : Supabase Pro, Netlify Pro, Brevo, Google Workspace, domaine (estimation) $150, Expert-comptable (estimation) $150, Assurances : RC pro plateforme et garantie colis (estimation à confirmer par devis) $200, Banque, outils divers (estimation) $50, Publicité permanente : Meta et Google (budget plafonné) $500).

- **Break-even: 10 envoi payés a day.** Below that you lose money every month.
- **Profit margin at your plan** (30 a day): **52%** of every sale, after every cost.
- Capacity: 10000 a day.

## Year 1, month by month

| month | envoi payés a day | revenue | profit | cumulative (after $8,600 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | $333 | -$2,001 | -$10,601 |
| 2 | 2 | $665 | -$1,753 | -$12,354 |
| 3 | 3 | $998 | -$1,504 | -$13,858 |
| 4 | 4 | $1,331 | -$1,255 | -$15,113 |
| 5 | 6 | $1,996 | -$758 | -$15,871 |
| 6 | 9 | $2,994 | -$12 | -$15,882 |
| 7 | 14 | $4,658 | $1,232 | -$14,651 |
| 8 | 12 | $3,992 | $734 | -$13,916 |
| 9 | 10 | $3,327 | $237 | -$13,679 |
| 10 | 12 | $3,992 | $734 | -$12,945 |
| 11 | 16 | $5,323 | $1,729 | -$11,216 |
| 12 | 22 | $7,319 | $3,221 | -$7,994 |

- **Year 1 operating profit: $606** on $36,930 of revenue.
- After the $8,600 startup spend: -$7,994.
- Startup money earned back: not within year 1.
- Cash you need before it pays for itself: **$15,882**.

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 52% | 10 | $606 |
| Price -10% | 47% | 11 | -$3,087 |
| Volume -20% | 47% | 10 | -$4,915 |
| Unit costs +15% | 48% | 10 | -$793 |

## Red flags

- The startup spend is not earned back within year 1.
