-- Villes du monde entier (fuseau horaire enregistré avec le trajet), livraison à domicile assurée
-- par Send By Me et son partenaire, suivi des envois, et finalisation du profil (photo, téléphone).

-- ─────────────────────────────────────────────────────────────
-- Trajets : fuseau horaire des villes (toutes les villes dotées d'un aéroport)
-- ─────────────────────────────────────────────────────────────
alter table public.trips
  add column from_tz text check (from_tz is null or char_length(from_tz) <= 60),
  add column to_tz text check (to_tz is null or char_length(to_tz) <= 60);
grant insert (from_tz, to_tz) on public.trips to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Livraison à domicile : service Send By Me, assuré par un partenaire de livraison (et non par le voyageur).
-- Le montant revient à Send By Me, qui rémunère le partenaire.
-- ─────────────────────────────────────────────────────────────
alter table public.trips alter column home_delivery_cents drop not null;
alter table public.trips alter column home_delivery_cents drop default;
update public.trips set home_delivery_cents = null;
revoke update (home_delivery_cents, home_delivery_area) on public.trips from authenticated;

alter table public.bookings
  add column delivery_status text check (delivery_status in ('requested', 'scheduled', 'out_for_delivery', 'delivered', 'failed')),
  add column delivery_partner_ref text check (delivery_partner_ref is null or char_length(delivery_partner_ref) <= 120);
update public.bookings set delivery_status = 'requested' where delivery_cents > 0;

-- ─────────────────────────────────────────────────────────────
-- Suivi d'envoi : numéro de suivi et étapes horodatées
-- ─────────────────────────────────────────────────────────────
create function private.new_tracking_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := 'SBM-';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.bookings where tracking_code = code);
  end loop;
  return code;
end;
$$;
revoke execute on function private.new_tracking_code() from public, anon, authenticated;

alter table public.bookings add column tracking_code text unique check (tracking_code ~ '^SBM-[A-Z0-9]{8}$');
update public.bookings set tracking_code = private.new_tracking_code() where tracking_code is null;
alter table public.bookings alter column tracking_code set default private.new_tracking_code();
alter table public.bookings alter column tracking_code set not null;

create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null check (kind in (
    'requested', 'accepted', 'paid', 'picked_up', 'departed', 'arrived',
    'out_for_delivery', 'delivered', 'declined', 'cancelled', 'refunded', 'delivery_failed'
  )),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index booking_events_booking_id_idx on public.booking_events (booking_id, created_at);
-- Une étape n'est enregistrée qu'une fois par envoi.
create unique index booking_events_once on public.booking_events (booking_id, kind);

alter table public.booking_events enable row level security;
create policy "Les participants voient le suivi"
  on public.booking_events for select to authenticated
  using ((select private.is_booking_party(booking_id)));
revoke all on public.booking_events from anon, authenticated;
grant select on public.booking_events to authenticated;

create function private.booking_track_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_events (booking_id, kind) values (new.id, 'requested') on conflict do nothing;
  elsif new.status is distinct from old.status and new.status::text in
      ('accepted', 'paid', 'picked_up', 'delivered', 'declined', 'cancelled', 'refunded') then
    insert into public.booking_events (booking_id, kind) values (new.id, new.status::text) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function private.booking_track_events() from public, anon, authenticated;

create trigger bookings_track_events
  after insert or update of status on public.bookings
  for each row execute function private.booking_track_events();

-- Étapes déjà passées des réservations existantes.
insert into public.booking_events (booking_id, kind, created_at)
select id, 'requested', created_at from public.bookings on conflict do nothing;
insert into public.booking_events (booking_id, kind, created_at)
select id, status::text, updated_at from public.bookings
where status::text in ('accepted', 'paid', 'picked_up', 'delivered', 'declined', 'cancelled', 'refunded')
on conflict do nothing;

-- Suivi public par numéro (pour le destinataire) : villes, étapes et dates, jamais de nom ni d'adresse.
create function public.track_shipment(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code', b.tracking_code,
    'status', b.status,
    'weight_kg', b.weight_kg,
    'home_delivery', b.delivery_cents > 0,
    'delivery_status', b.delivery_status,
    'from_city', t.from_city,
    'to_city', t.to_city,
    'from_tz', t.from_tz,
    'departure_at', t.departure_at,
    'mode', t.mode,
    'transport_ref', t.transport_ref,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('kind', e.kind, 'at', e.created_at, 'note', e.note) order by e.created_at)
      from public.booking_events e where e.booking_id = b.id
    ), '[]'::jsonb)
  )
  from public.bookings b
  join public.trips t on t.id = b.trip_id
  where b.tracking_code = upper(trim(p_code));
$$;
revoke execute on function public.track_shipment(text) from public;
grant execute on function public.track_shipment(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Finalisation du profil après inscription (Google, Facebook ou e-mail)
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column onboarded_at timestamptz;
update public.profiles set onboarded_at = created_at where onboarded_at is null; -- membres existants : pas d'écran d'accueil
grant update (onboarded_at) on public.profiles to authenticated;

-- Photos de profil : publiques, chaque membre écrit uniquement dans son dossier.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Photo de profil : dépôt dans son dossier"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Photo de profil : remplacement dans son dossier"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Photo de profil : suppression dans son dossier"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─────────────────────────────────────────────────────────────
-- Adresse de livraison : visible par l'expéditeur et l'équipe (pour le partenaire), plus par le voyageur.
-- ─────────────────────────────────────────────────────────────
create table public.booking_deliveries (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  address text not null check (char_length(address) between 5 and 300),
  created_at timestamptz not null default now()
);
create index booking_deliveries_sender_id_idx on public.booking_deliveries (sender_id);
alter table public.booking_deliveries enable row level security;
create policy "L'expéditeur voit son adresse de livraison"
  on public.booking_deliveries for select to authenticated
  using ((select auth.uid()) = sender_id);
revoke all on public.booking_deliveries from anon, authenticated;
grant select on public.booking_deliveries to authenticated;

insert into public.booking_deliveries (booking_id, sender_id, address)
select id, sender_id, delivery_address from public.bookings where delivery_address is not null
on conflict do nothing;
alter table public.bookings drop constraint bookings_home_delivery_check;
alter table public.bookings drop column delivery_address;
