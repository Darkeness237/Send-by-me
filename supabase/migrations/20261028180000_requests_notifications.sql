-- Demandes d'envoi (l'expéditeur décrit son colis, les trajets correspondants lui sont proposés)
-- et notifications (dans l'application, push sur le téléphone, e-mail).

-- ─────────────────────────────────────────────────────────────
-- Demandes d'envoi
-- ─────────────────────────────────────────────────────────────
create table public.shipment_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  from_city text not null check (char_length(from_city) between 2 and 80),
  from_country text not null default '—' check (char_length(from_country) <= 60),
  to_city text not null check (char_length(to_city) between 2 and 80),
  to_country text not null default '—' check (char_length(to_country) <= 60),
  earliest_date date not null,
  latest_date date not null,
  weight_kg numeric(5, 1) not null check (weight_kg > 0 and weight_kg <= 300),
  length_cm smallint check (length_cm is null or length_cm between 1 and 300),
  width_cm smallint check (width_cm is null or width_cm between 1 and 300),
  height_cm smallint check (height_cm is null or height_cm between 1 and 300),
  category text not null check (char_length(category) <= 40),
  description text not null check (char_length(description) between 3 and 1000),
  declared_value_cents integer check (declared_value_cents is null or declared_value_cents between 0 and 1000000),
  max_price_per_kg_cents integer check (max_price_per_kg_cents is null or max_price_per_kg_cents between 100 and 20000),
  wants_home_delivery boolean not null default false,
  photos text[] not null default '{}' check (cardinality(photos) <= 6),
  status text not null default 'open' check (status in ('open', 'matched', 'closed')),
  created_at timestamptz not null default now(),
  check (latest_date >= earliest_date)
);
create index shipment_requests_sender_id_idx on public.shipment_requests (sender_id);
create index shipment_requests_open_idx on public.shipment_requests (lower(from_city), lower(to_city), latest_date) where status = 'open';

alter table public.shipment_requests enable row level security;
create policy "Demandes ouvertes visibles par tous"
  on public.shipment_requests for select to anon, authenticated
  using (status = 'open' or (select auth.uid()) = sender_id);
create policy "L'expéditeur ferme sa demande"
  on public.shipment_requests for update to authenticated
  using ((select auth.uid()) = sender_id)
  with check ((select auth.uid()) = sender_id);
revoke all on public.shipment_requests from anon, authenticated;
grant select on public.shipment_requests to anon, authenticated;
grant update (status) on public.shipment_requests to authenticated;
-- Création par le serveur (qui vérifie les photos et normalise les villes).

-- Photos des colis : publiques (noms aléatoires), chaque membre écrit dans son dossier.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-photos', 'request-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "Photos de colis : dépôt dans son dossier"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'request-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Photos de colis : suppression dans son dossier"
  on storage.objects for delete to authenticated
  using (bucket_id = 'request-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Une discussion peut naître d'une demande (le voyageur propose son trajet).
alter table public.inquiries add column request_id uuid references public.shipment_requests (id) on delete set null;
create index inquiries_request_id_idx on public.inquiries (request_id);

-- ─────────────────────────────────────────────────────────────
-- Notifications
-- ─────────────────────────────────────────────────────────────
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (char_length(kind) <= 40),
  title text not null check (char_length(title) <= 120),
  body text check (body is null or char_length(body) <= 400),
  href text check (href is null or (href ~ '^/' and char_length(href) <= 300)),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_id_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "Le membre voit ses notifications"
  on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy "Le membre marque ses notifications comme lues"
  on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.notifications from anon, authenticated;
grant select, update (read_at) on public.notifications to authenticated;

alter publication supabase_realtime add table public.notifications;

-- Abonnements aux notifications push (navigateur ou application installée).
create table public.push_subscriptions (
  endpoint text primary key check (char_length(endpoint) <= 1000),
  user_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
-- Gérées par le serveur uniquement.

-- Préférences : e-mails de notification (activés par défaut).
alter table public.profiles add column email_notifications boolean not null default true;
grant update (email_notifications) on public.profiles to authenticated;
