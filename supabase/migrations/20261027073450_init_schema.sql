-- Send By Me — schéma initial
-- Principes :
--   * RLS activée sur toutes les tables exposées.
--   * Les lectures passent par la session de l'utilisateur (RLS).
--   * Les changements d'état sensibles (réservations, paiements) passent par le serveur
--     (clé secrète) après vérification de l'identité, jamais directement depuis le navigateur.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Profils
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  bio text check (bio is null or char_length(bio) <= 600),
  city text check (city is null or char_length(city) <= 80),
  id_verified boolean not null default false, -- modifié uniquement par l'équipe (service role)
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profils visibles par tous"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Chacun modifie son profil"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Les utilisateurs ne peuvent modifier que ces colonnes (pas id_verified).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (full_name, avatar_url, bio, city) on public.profiles to authenticated;

-- Création automatique du profil à l'inscription.
-- raw_user_meta_data sert uniquement à préremplir le nom, jamais à autoriser quoi que ce soit.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80));
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Trajets
-- ─────────────────────────────────────────────────────────────
create type public.trip_mode as enum ('plane', 'car', 'bus', 'train');
create type public.trip_status as enum ('published', 'full', 'departed', 'completed', 'cancelled');

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references public.profiles (id) on delete cascade,
  from_city text not null check (char_length(from_city) between 2 and 80),
  from_country text not null check (char_length(from_country) between 2 and 80),
  to_city text not null check (char_length(to_city) between 2 and 80),
  to_country text not null check (char_length(to_country) between 2 and 80),
  departure_at timestamptz not null,
  arrival_at timestamptz,
  mode public.trip_mode not null default 'plane',
  capacity_kg numeric(5, 1) not null check (capacity_kg > 0 and capacity_kg <= 100),
  reserved_kg numeric(5, 1) not null default 0 check (reserved_kg >= 0),
  price_per_kg_cents integer not null check (price_per_kg_cents between 100 and 10000),
  accepted_categories text[] not null default '{}',
  pickup_note text check (pickup_note is null or char_length(pickup_note) <= 300),
  dropoff_note text check (dropoff_note is null or char_length(dropoff_note) <= 300),
  notes text check (notes is null or char_length(notes) <= 1000),
  status public.trip_status not null default 'published',
  created_at timestamptz not null default now(),
  constraint trips_capacity_check check (reserved_kg <= capacity_kg),
  constraint trips_arrival_check check (arrival_at is null or arrival_at >= departure_at),
  constraint trips_route_check check (lower(from_city) <> lower(to_city))
);

create index trips_traveler_id_idx on public.trips (traveler_id);
create index trips_search_idx on public.trips (lower(from_city), lower(to_city), departure_at)
  where status = 'published';

alter table public.trips enable row level security;

create policy "Trajets publiés visibles par tous"
  on public.trips for select
  to anon, authenticated
  using (status <> 'cancelled' or (select auth.uid()) = traveler_id);

create policy "Le voyageur crée ses trajets"
  on public.trips for insert
  to authenticated
  with check ((select auth.uid()) = traveler_id and reserved_kg = 0 and status = 'published');

create policy "Le voyageur modifie ses trajets"
  on public.trips for update
  to authenticated
  using ((select auth.uid()) = traveler_id)
  with check ((select auth.uid()) = traveler_id);

revoke insert, update, delete on public.trips from anon, authenticated;
grant select on public.trips to anon, authenticated;
grant insert (traveler_id, from_city, from_country, to_city, to_country, departure_at, arrival_at, mode,
  capacity_kg, price_per_kg_cents, accepted_categories, pickup_note, dropoff_note, notes)
  on public.trips to authenticated;
-- reserved_kg et le statut "full" sont gérés par le serveur.
grant update (departure_at, arrival_at, pickup_note, dropoff_note, notes, status) on public.trips to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Réservations
-- ─────────────────────────────────────────────────────────────
create type public.booking_status as enum
  ('pending', 'accepted', 'paid', 'picked_up', 'delivered', 'declined', 'cancelled');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete restrict,
  sender_id uuid not null references public.profiles (id) on delete restrict,
  weight_kg numeric(5, 1) not null check (weight_kg > 0 and weight_kg <= 100),
  category text not null check (char_length(category) <= 40),
  description text not null check (char_length(description) between 3 and 500),
  recipient_name text not null check (char_length(recipient_name) between 2 and 80),
  recipient_phone text not null check (recipient_phone ~ '^\+?[0-9 ]{8,20}$'),
  base_cents integer not null check (base_cents >= 0),
  fee_cents integer not null check (fee_cents >= 0),
  total_cents integer not null check (total_cents = base_cents + fee_cents),
  status public.booking_status not null default 'pending',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_trip_id_idx on public.bookings (trip_id);
create index bookings_sender_id_idx on public.bookings (sender_id);

-- Aide RLS : l'utilisateur est-il expéditeur ou voyageur de cette réservation ?
create function private.is_booking_party(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    join public.trips t on t.id = b.trip_id
    where b.id = p_booking_id
      and (b.sender_id = (select auth.uid()) or t.traveler_id = (select auth.uid()))
  );
$$;
revoke execute on function private.is_booking_party(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_booking_party(uuid) to authenticated;

alter table public.bookings enable row level security;

create policy "Expéditeur et voyageur voient la réservation"
  on public.bookings for select
  to authenticated
  using ((select private.is_booking_party(id)));

-- Aucune écriture directe : création et transitions passent par le serveur.
revoke insert, update, delete on public.bookings from anon, authenticated;
grant select on public.bookings to authenticated;

-- Code de remise : visible uniquement par l'expéditeur, qui le transmet au destinataire.
create table public.booking_secrets (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  delivery_code text not null check (delivery_code ~ '^[0-9]{6}$'),
  attempts smallint not null default 0
);
create index booking_secrets_sender_id_idx on public.booking_secrets (sender_id);

alter table public.booking_secrets enable row level security;

create policy "Seul l'expéditeur voit le code"
  on public.booking_secrets for select
  to authenticated
  using ((select auth.uid()) = sender_id);

revoke insert, update, delete on public.booking_secrets from anon, authenticated;
grant select on public.booking_secrets to authenticated;

-- Réserve la capacité de façon atomique quand le voyageur accepte.
-- Appelée uniquement par le serveur (service_role) après vérification du voyageur.
create function public.accept_booking(p_booking_id uuid, p_traveler_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_trip_id uuid;
  v_weight numeric;
begin
  select b.trip_id, b.weight_kg into v_trip_id, v_weight
  from public.bookings b
  join public.trips t on t.id = b.trip_id
  where b.id = p_booking_id and b.status = 'pending' and t.traveler_id = p_traveler_id
  for update of b;

  if v_trip_id is null then
    return false;
  end if;

  update public.trips
  set reserved_kg = reserved_kg + v_weight,
      status = case when reserved_kg + v_weight >= capacity_kg then 'full'::public.trip_status else status end
  where id = v_trip_id
    and status = 'published'
    and reserved_kg + v_weight <= capacity_kg;

  if not found then
    return false;
  end if;

  update public.bookings set status = 'accepted', updated_at = now() where id = p_booking_id;
  return true;
end;
$$;
revoke execute on function public.accept_booking(uuid, uuid) from public, anon, authenticated;
grant execute on function public.accept_booking(uuid, uuid) to service_role;

-- Libère la capacité (refus après acceptation, annulation).
create function public.release_booking(p_booking_id uuid, p_new_status public.booking_status)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_trip_id uuid;
  v_weight numeric;
begin
  select trip_id, weight_kg into v_trip_id, v_weight
  from public.bookings
  where id = p_booking_id and status = 'accepted'
  for update;

  if v_trip_id is null then
    return false;
  end if;

  update public.trips
  set reserved_kg = greatest(0, reserved_kg - v_weight),
      status = case when status = 'full' then 'published'::public.trip_status else status end
  where id = v_trip_id;

  update public.bookings set status = p_new_status, updated_at = now() where id = p_booking_id;
  return true;
end;
$$;
revoke execute on function public.release_booking(uuid, public.booking_status) from public, anon, authenticated;
grant execute on function public.release_booking(uuid, public.booking_status) to service_role;

-- ─────────────────────────────────────────────────────────────
-- Messages (entre expéditeur et voyageur d'une réservation)
-- ─────────────────────────────────────────────────────────────
create table public.messages (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_booking_id_idx on public.messages (booking_id, created_at);
create index messages_author_id_idx on public.messages (author_id);

alter table public.messages enable row level security;

create policy "Les participants lisent les messages"
  on public.messages for select
  to authenticated
  using ((select private.is_booking_party(booking_id)));

create policy "Les participants écrivent en leur nom"
  on public.messages for insert
  to authenticated
  with check ((select auth.uid()) = author_id and (select private.is_booking_party(booking_id)));

revoke update, delete on public.messages from anon, authenticated;
grant select, insert on public.messages to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Avis (après livraison, un par personne et par réservation)
-- ─────────────────────────────────────────────────────────────
create table public.reviews (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 600),
  created_at timestamptz not null default now(),
  unique (booking_id, author_id),
  check (author_id <> subject_id)
);
create index reviews_subject_id_idx on public.reviews (subject_id);
create index reviews_author_id_idx on public.reviews (author_id);

alter table public.reviews enable row level security;

create policy "Avis visibles par tous"
  on public.reviews for select
  to anon, authenticated
  using (true);

-- Écriture via le serveur, qui vérifie que la livraison a eu lieu.
revoke insert, update, delete on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;

-- Note moyenne (vue en security_invoker pour respecter la RLS)
create view public.profile_ratings with (security_invoker = true) as
  select subject_id as profile_id,
         round(avg(rating)::numeric, 1) as rating_avg,
         count(*)::int as rating_count
  from public.reviews
  group by subject_id;
grant select on public.profile_ratings to anon, authenticated;

-- Temps réel pour la messagerie
alter publication supabase_realtime add table public.messages;
