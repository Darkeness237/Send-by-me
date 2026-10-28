-- Négociation du prix, e-mail du destinataire (code de réception), passage automatique « en transit »
-- d'après les horaires du vol, et blocage des numéros de téléphone dans la messagerie.

-- ─────────────────────────────────────────────────────────────
-- Destinataire : e-mail pour lui envoyer le code de réception
-- ─────────────────────────────────────────────────────────────
alter table public.bookings
  add column recipient_email text check (recipient_email is null or recipient_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(recipient_email) <= 120),
  add column price_per_kg_cents integer check (price_per_kg_cents is null or price_per_kg_cents between 100 and 100000),
  add column recipient_notified_at timestamptz;

update public.bookings b set price_per_kg_cents = t.price_per_kg_cents from public.trips t where t.id = b.trip_id and b.price_per_kg_cents is null;

-- ─────────────────────────────────────────────────────────────
-- Négociation : l'expéditeur propose un prix au kilo, le voyageur accepte, refuse ou fait une contre-offre
-- ─────────────────────────────────────────────────────────────
create table public.price_offers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  price_per_kg_cents integer not null check (price_per_kg_cents between 100 and 100000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'superseded')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index price_offers_booking_id_idx on public.price_offers (booking_id, created_at);
create index price_offers_author_id_idx on public.price_offers (author_id);
-- Une seule offre en attente à la fois par réservation.
create unique index price_offers_one_pending on public.price_offers (booking_id) where status = 'pending';

alter table public.price_offers enable row level security;
create policy "Les participants voient la négociation"
  on public.price_offers for select to authenticated
  using ((select private.is_booking_party(booking_id)));
revoke all on public.price_offers from anon, authenticated;
grant select on public.price_offers to authenticated;

alter publication supabase_realtime add table public.price_offers;

-- Nouveau prix accepté (avant l'acceptation de la demande) : montants recalculés par le serveur.
-- Le crédit de parrainage déjà déduit est ramené au plus à la nouvelle commission.
create function public.reprice_booking(
  p_booking_id uuid, p_price_cents integer, p_base integer, p_fee integer,
  p_commission_rate numeric, p_processing integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_discount integer;
  v_delivery integer;
  v_commission integer;
begin
  select discount_cents, delivery_cents into v_discount, v_delivery
  from public.bookings where id = p_booking_id and status = 'pending' for update;
  if not found then
    return false;
  end if;
  v_commission := p_fee - p_processing;
  if v_discount > v_commission then
    update public.credit_entries set amount_cents = -greatest(v_commission, 0)
    where booking_id = p_booking_id and reason = 'booking';
    v_discount := greatest(v_commission, 0);
  end if;
  update public.bookings
    set price_per_kg_cents = p_price_cents,
        base_cents = p_base,
        fee_cents = p_fee,
        commission_rate = p_commission_rate,
        processing_cents = p_processing,
        discount_cents = v_discount,
        total_cents = p_base + v_delivery + p_fee - v_discount,
        updated_at = now()
    where id = p_booking_id;
  return true;
end;
$$;
revoke execute on function public.reprice_booking(uuid, integer, integer, integer, numeric, integer) from public, anon, authenticated;
grant execute on function public.reprice_booking(uuid, integer, integer, integer, numeric, integer) to service_role;

-- ─────────────────────────────────────────────────────────────
-- Transit automatique : d'après l'heure de départ et l'arrivée prévue du vol
-- ─────────────────────────────────────────────────────────────
create function public.advance_transit(p_booking_id uuid default null)
returns table (booking_id uuid, kind text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    -- Les étapes ne sont jamais datées avant la prise en charge du colis.
    select b.id,
      greatest(t.departure_at, coalesce(p.created_at, t.departure_at)) as departure_at,
      greatest(t.arrival_at, coalesce(p.created_at, t.arrival_at)) as arrival_at,
      t.departure_at as departs, t.arrival_at as arrives
    from public.bookings b
    join public.trips t on t.id = b.trip_id
    left join public.booking_events p on p.booking_id = b.id and p.kind = 'picked_up'
    where b.status = 'picked_up' and (p_booking_id is null or b.id = p_booking_id)
  ),
  departed as (
    insert into public.booking_events (booking_id, kind, created_at)
    select c.id, 'departed', c.departure_at from candidates c where c.departs <= now()
    on conflict do nothing
    returning booking_events.booking_id, booking_events.kind
  ),
  arrived as (
    insert into public.booking_events (booking_id, kind, created_at)
    select c.id, 'arrived', c.arrival_at from candidates c where c.arrives is not null and c.arrives <= now()
    on conflict do nothing
    returning booking_events.booking_id, booking_events.kind
  )
  select d.booking_id, d.kind from departed d
  union all
  select a.booking_id, a.kind from arrived a;
end;
$$;
revoke execute on function public.advance_transit(uuid) from public, anon, authenticated;
grant execute on function public.advance_transit(uuid) to service_role;

-- ─────────────────────────────────────────────────────────────
-- Messagerie : pas d'échange de numéros de téléphone ni d'adresses e-mail
-- (le serveur filtre aussi les numéros écrits en lettres ; ce garde-fou couvre l'API directe)
-- ─────────────────────────────────────────────────────────────
create function private.reject_contact_details()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_digits text := regexp_replace(new.body, '[\s.\-_/()+]', '', 'g');
begin
  if v_digits ~ '[0-9]{8,}' or new.body ~* '[^@\s]+@[^@\s]+\.[a-z]{2,}' or new.body ~* '(wa\.me|whatsapp\.com|t\.me/)' then
    raise exception 'Les coordonnées personnelles ne peuvent pas être échangées dans la messagerie'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger messages_no_contact_details
  before insert or update of body on public.messages
  for each row execute function private.reject_contact_details();
