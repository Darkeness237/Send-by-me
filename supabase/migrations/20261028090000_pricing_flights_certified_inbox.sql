-- Tarification détaillée, livraison à domicile, informations de vol contrôlées,
-- compte certifié (identité + adresse), coordonnées privées et messagerie avant réservation.

-- ─────────────────────────────────────────────────────────────
-- Profils : compte certifié et intention à l'inscription
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column address_verified boolean not null default false, -- modifié uniquement par l'équipe
  add column intent text not null default 'both' check (intent in ('send', 'travel', 'both')),
  add column certified boolean generated always as (id_verified and address_verified) stored;

grant update (intent) on public.profiles to authenticated;

-- Coordonnées privées : jamais visibles par les autres membres.
create table public.member_contacts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_name text check (last_name is null or char_length(last_name) <= 80),
  phone text check (phone is null or phone ~ '^\+?[0-9 ]{8,20}$'),
  address_line text check (address_line is null or char_length(address_line) <= 200),
  postal_code text check (postal_code is null or char_length(postal_code) <= 20),
  address_city text check (address_city is null or char_length(address_city) <= 80),
  country text check (country is null or char_length(country) <= 60),
  updated_at timestamptz not null default now()
);
alter table public.member_contacts enable row level security;

create policy "Le membre voit ses coordonnées"
  on public.member_contacts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Le membre crée ses coordonnées"
  on public.member_contacts for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Le membre modifie ses coordonnées"
  on public.member_contacts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.member_contacts from anon, authenticated;
grant select, insert (user_id, last_name, phone, address_line, postal_code, address_city, country, updated_at),
  update (last_name, phone, address_line, postal_code, address_city, country, updated_at)
  on public.member_contacts to authenticated;

-- Nouveau membre : pseudonyme public « Prénom N. » (aussi pour Google / Facebook), nom complet gardé en privé.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_name text := trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''));
  first_part text := split_part(raw_name, ' ', 1);
  last_part text := trim(substring(raw_name from char_length(first_part) + 1));
  display text;
  wanted text := coalesce(new.raw_user_meta_data ->> 'intent', 'both');
begin
  display := case
    when new.raw_user_meta_data ? 'display_name' then new.raw_user_meta_data ->> 'display_name'
    when last_part <> '' then first_part || ' ' || upper(left(last_part, 1)) || '.'
    else raw_name
  end;
  insert into public.profiles (id, full_name, city, intent)
  values (
    new.id,
    left(display, 80),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'city', ''), 80), ''),
    case when wanted in ('send', 'travel', 'both') then wanted else 'both' end
  );
  insert into public.member_contacts (user_id, last_name, phone, country)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'last_name', last_part), 80), ''),
    case when coalesce(new.raw_user_meta_data ->> 'phone', '') ~ '^\+?[0-9 ]{8,20}$' then new.raw_user_meta_data ->> 'phone' end,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'country', ''), 60), '')
  );
  return new;
end;
$$;

-- Les membres déjà inscrits ont aussi une fiche de coordonnées.
insert into public.member_contacts (user_id) select id from public.profiles on conflict do nothing;

-- Vérification d'adresse : même circuit que la pièce d'identité.
alter table public.identity_verifications
  add column kind text not null default 'identity' check (kind in ('identity', 'address'));
alter table public.identity_verifications drop constraint identity_verifications_document_type_check;
alter table public.identity_verifications add constraint identity_verifications_document_type_check
  check (document_type in ('cni', 'passport', 'residence_permit', 'driving_license', 'proof_of_address'));
alter table public.identity_verifications add constraint identity_verifications_kind_type_check
  check ((kind = 'address') = (document_type = 'proof_of_address'));
drop index public.identity_verifications_one_pending;
create unique index identity_verifications_one_pending on public.identity_verifications (user_id, kind) where status = 'pending';
grant select (kind) on public.identity_verifications to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Trajets : livraison à domicile et informations de transport
-- ─────────────────────────────────────────────────────────────
alter table public.trips
  add column home_delivery_cents integer check (home_delivery_cents is null or home_delivery_cents between 100 and 10000),
  add column home_delivery_area text check (home_delivery_area is null or char_length(home_delivery_area) <= 200),
  add column carrier text check (carrier is null or char_length(carrier) <= 80),        -- compagnie (IATA) ou transporteur
  add column transport_ref text check (transport_ref is null or char_length(transport_ref) <= 20), -- n° de vol, de train…
  add column from_airport text check (from_airport is null or from_airport ~ '^[A-Z]{3}$'),
  add column to_airport text check (to_airport is null or to_airport ~ '^[A-Z]{3}$'),
  add column has_stopover boolean not null default false,
  add column baggage_allowance_kg numeric(5, 1) check (baggage_allowance_kg is null or baggage_allowance_kg between 0 and 200),
  -- Résultat des contrôles automatiques, calculé par le serveur uniquement.
  add column transport_check text not null default 'unchecked'
    check (transport_check in ('unchecked', 'consistent', 'confirmed', 'mismatch')),
  add column transport_check_notes jsonb not null default '[]'::jsonb;

grant insert (home_delivery_cents, home_delivery_area, carrier, transport_ref, from_airport, to_airport,
  has_stopover, baggage_allowance_kg) on public.trips to authenticated;
grant update (home_delivery_cents, home_delivery_area) on public.trips to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Réservations : livraison à domicile dans le prix
-- ─────────────────────────────────────────────────────────────
alter table public.bookings
  add column delivery_cents integer not null default 0 check (delivery_cents >= 0),
  add column delivery_address text check (delivery_address is null or char_length(delivery_address) between 5 and 300),
  add column commission_rate numeric(5, 4),
  add column processing_cents integer not null default 0 check (processing_cents >= 0);
alter table public.bookings drop constraint bookings_check;
alter table public.bookings add constraint bookings_total_check check (total_cents = base_cents + delivery_cents + fee_cents);
alter table public.bookings add constraint bookings_home_delivery_check
  check ((delivery_cents > 0) = (delivery_address is not null));

-- ─────────────────────────────────────────────────────────────
-- Messagerie : questions avant réservation
-- ─────────────────────────────────────────────────────────────
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  traveler_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (trip_id, sender_id),
  check (sender_id <> traveler_id)
);
create index inquiries_sender_id_idx on public.inquiries (sender_id);
create index inquiries_traveler_id_idx on public.inquiries (traveler_id);

alter table public.inquiries enable row level security;
create policy "Les deux membres voient la discussion"
  on public.inquiries for select to authenticated
  using ((select auth.uid()) in (sender_id, traveler_id));
revoke all on public.inquiries from anon, authenticated;
grant select on public.inquiries to authenticated;
-- Création par le serveur (qui vérifie le trajet et le voyageur).

create function private.is_inquiry_party(p_inquiry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.inquiries i
    where i.id = p_inquiry_id and (select auth.uid()) in (i.sender_id, i.traveler_id)
  );
$$;
revoke execute on function private.is_inquiry_party(uuid) from public, anon;
grant execute on function private.is_inquiry_party(uuid) to authenticated;

alter table public.messages alter column booking_id drop not null;
alter table public.messages add column inquiry_id uuid references public.inquiries (id) on delete cascade;
alter table public.messages add constraint messages_one_thread check (num_nonnulls(booking_id, inquiry_id) = 1);
create index messages_inquiry_id_idx on public.messages (inquiry_id, created_at) where inquiry_id is not null;

drop policy "Les participants lisent les messages" on public.messages;
drop policy "Les participants écrivent en leur nom" on public.messages;
create policy "Les participants lisent les messages"
  on public.messages for select to authenticated
  using (
    (booking_id is not null and (select private.is_booking_party(booking_id)))
    or (inquiry_id is not null and (select private.is_inquiry_party(inquiry_id)))
  );
create policy "Les participants écrivent en leur nom"
  on public.messages for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and (
      (booking_id is not null and (select private.is_booking_party(booking_id)))
      or (inquiry_id is not null and (select private.is_inquiry_party(inquiry_id)))
    )
  );
revoke insert on public.messages from authenticated;
grant insert (booking_id, inquiry_id, author_id, body) on public.messages to authenticated;

-- Lu / non lu : dernière lecture de chaque discussion par membre.
create table public.thread_reads (
  user_id uuid not null references public.profiles (id) on delete cascade,
  thread_id uuid not null, -- id de réservation ou de discussion
  read_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);
alter table public.thread_reads enable row level security;
create policy "Le membre gère ses lectures (lecture)"
  on public.thread_reads for select to authenticated using ((select auth.uid()) = user_id);
create policy "Le membre gère ses lectures (ajout)"
  on public.thread_reads for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Le membre gère ses lectures (mise à jour)"
  on public.thread_reads for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.thread_reads from anon, authenticated;
grant select, insert, update on public.thread_reads to authenticated;
