-- Virements automatiques : compte connecté Stripe du voyageur (Stripe vérifie son identité et garde son IBAN).
-- Le site y transfère la part du voyageur dès que la livraison est validée par le code du destinataire.
-- Écrit uniquement côté serveur (clé de service) ; le membre lit l'état de son propre compte.
create table public.stripe_connect_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  account_id text not null unique check (account_id ~ '^acct_[A-Za-z0-9]+$'),
  country text not null check (country ~ '^[A-Z]{2}$'),
  transfers_active boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.stripe_connect_accounts enable row level security;

create policy "Le membre voit son compte de versement Stripe"
  on public.stripe_connect_accounts for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.stripe_connect_accounts from anon, authenticated;
grant select on public.stripe_connect_accounts to authenticated;
