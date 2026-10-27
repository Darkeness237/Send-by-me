-- Send By Me — administration, signalements, versements, remboursements, alertes de ligne

-- ─────────────────────────────────────────────────────────────
-- Rôle admin : lu depuis app_metadata (modifiable uniquement côté serveur),
-- jamais depuis user_metadata.
-- ─────────────────────────────────────────────────────────────
create function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin';
$$;
revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Remboursement et versement au voyageur
-- ─────────────────────────────────────────────────────────────
alter type public.booking_status add value if not exists 'refunded';

create type public.payout_status as enum ('not_due', 'due', 'paid');

alter table public.bookings
  add column payout_status public.payout_status not null default 'not_due',
  add column payout_reference text check (payout_reference is null or char_length(payout_reference) <= 120),
  add column paid_out_at timestamptz,
  add column refunded_at timestamptz;

-- Une réservation livrée rend le versement exigible.
create function private.set_payout_due()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' and new.payout_status = 'not_due' then
    new.payout_status := 'due';
  end if;
  return new;
end;
$$;
revoke execute on function private.set_payout_due() from public, anon, authenticated;

create trigger bookings_set_payout_due
  before update of status on public.bookings
  for each row execute function private.set_payout_due();

create index bookings_payout_due_idx on public.bookings (delivered_at) where payout_status = 'due';

-- ─────────────────────────────────────────────────────────────
-- Signalements (problème sur une réservation)
-- ─────────────────────────────────────────────────────────────
create type public.report_status as enum ('open', 'resolved');

create table public.reports (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('not_delivered', 'damaged', 'forbidden_item', 'behaviour', 'payment', 'other')),
  details text not null check (char_length(details) between 10 and 2000),
  status public.report_status not null default 'open',
  resolution text check (resolution is null or char_length(resolution) <= 2000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_booking_id_idx on public.reports (booking_id);
create index reports_author_id_idx on public.reports (author_id);
create index reports_open_idx on public.reports (created_at) where status = 'open';

alter table public.reports enable row level security;

create policy "L'auteur voit ses signalements"
  on public.reports for select
  to authenticated
  using ((select auth.uid()) = author_id or (select private.is_admin()));

create policy "Un participant signale en son nom"
  on public.reports for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and status = 'open'
    and resolution is null
    and (select private.is_booking_party(booking_id))
  );

revoke update, delete on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (booking_id, author_id, reason, details) on public.reports to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Alertes de ligne (être prévenu des nouveaux trajets)
-- ─────────────────────────────────────────────────────────────
create table public.route_alerts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  from_city text not null check (char_length(from_city) between 2 and 80),
  to_city text not null check (char_length(to_city) between 2 and 80),
  created_at timestamptz not null default now(),
  unique (user_id, from_city, to_city)
);
create index route_alerts_route_idx on public.route_alerts (lower(from_city), lower(to_city));

alter table public.route_alerts enable row level security;

create policy "Chacun gère ses alertes (lecture)"
  on public.route_alerts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Chacun gère ses alertes (création)"
  on public.route_alerts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Chacun gère ses alertes (suppression)"
  on public.route_alerts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke update on public.route_alerts from anon, authenticated;
grant select, insert, delete on public.route_alerts to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Remboursement : statut + libération des kilos, en une transaction.
-- Appelée par le serveur (service_role) après le remboursement Stripe.
-- ─────────────────────────────────────────────────────────────
create function public.refund_booking(p_booking_id uuid)
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
  where id = p_booking_id and status in ('paid', 'picked_up')
  for update;

  if v_trip_id is null then
    return false;
  end if;

  update public.trips
  set reserved_kg = greatest(0, reserved_kg - v_weight),
      status = case when status = 'full' then 'published'::public.trip_status else status end
  where id = v_trip_id;

  update public.bookings
  set status = 'refunded', refunded_at = now(), updated_at = now(), payout_status = 'not_due'
  where id = p_booking_id;
  return true;
end;
$$;
revoke execute on function public.refund_booking(uuid) from public, anon, authenticated;
grant execute on function public.refund_booking(uuid) to service_role;

-- Temps réel sur les réservations (la RLS filtre les événements reçus)
alter publication supabase_realtime add table public.bookings;
