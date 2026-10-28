-- Moyen de versement du voyageur : où Send By Me lui verse ses gains (virement bancaire ou Mobile Money).
-- Donnée privée : seul le membre la voit et la modifie ; l'administration la lit côté serveur (clé de service)
-- au moment de faire le versement.
create table public.payout_methods (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('iban', 'mobile_money')),
  holder_name text not null check (char_length(holder_name) between 2 and 100),
  iban text check (iban is null or iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$'),
  bic text check (bic is null or bic ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
  mobile_operator text check (mobile_operator is null or mobile_operator in ('orange', 'mtn', 'wave', 'moov', 'airtel', 'free', 'autre')),
  mobile_number text check (mobile_number is null or mobile_number ~ '^\+[0-9]{8,15}$'),
  country text check (country is null or char_length(country) <= 60),
  updated_at timestamptz not null default now(),
  check ((kind = 'iban') = (iban is not null)),
  check ((kind = 'mobile_money') = (mobile_number is not null and mobile_operator is not null))
);
alter table public.payout_methods enable row level security;

create policy "Le membre voit son moyen de versement"
  on public.payout_methods for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Le membre enregistre son moyen de versement"
  on public.payout_methods for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Le membre modifie son moyen de versement"
  on public.payout_methods for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Le membre supprime son moyen de versement"
  on public.payout_methods for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.payout_methods from anon, authenticated;
grant select, insert, update, delete on public.payout_methods to authenticated;
