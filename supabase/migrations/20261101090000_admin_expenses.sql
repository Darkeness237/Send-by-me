-- Frais annexes saisis par l'équipe (livreur partenaire, publicité, logiciels, emballages…),
-- pour calculer le résultat réel de Send By Me dans l'administration.
-- Lu et écrit uniquement côté serveur (clé de service), après vérification du rôle admin.
create table public.admin_expenses (
  id bigint generated always as identity primary key,
  spent_on date not null default current_date,
  category text not null check (category in ('livraison', 'stripe', 'marketing', 'logiciel', 'materiel', 'geste_commercial', 'autre')),
  label text not null check (char_length(label) between 2 and 140),
  amount_cents integer not null check (amount_cents between 1 and 10000000),
  booking_id uuid references public.bookings (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index admin_expenses_spent_on_idx on public.admin_expenses (spent_on desc);
create index admin_expenses_booking_idx on public.admin_expenses (booking_id) where booking_id is not null;
create index admin_expenses_created_by_idx on public.admin_expenses (created_by) where created_by is not null;

alter table public.admin_expenses enable row level security;
revoke all on public.admin_expenses from anon, authenticated;
