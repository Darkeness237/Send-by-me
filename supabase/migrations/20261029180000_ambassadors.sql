-- Programme Ambassadeur : les voyageurs réguliers et fiables sont récompensés en argent et en visibilité.
--   Statut : identité vérifiée, au moins 3 livraisons réussies comme voyageur, note moyenne d'au moins 4,5 (si notés).
--   Primes (versées avec les versements, à la main depuis l'administration) :
--     10 € à la 3e livraison, puis 5 € toutes les 5 livraisons (8e, 13e, 18e…) ;
--     5 € en argent, au lieu du crédit de parrainage, quand un filleul réussit sa première livraison.
--   Visibilité : badge, annonces mises en avant (comme les 3 premiers trajets de chaque voyageur).
--   Les autres voyageurs peuvent mettre un trajet en avant pour 1 €, retenu sur leur versement.

alter table public.profiles add column ambassador_since timestamptz;
alter table public.trips
  add column featured boolean not null default false,
  -- Mise en avant payante : 1 €, retenu sur le premier versement du trajet (jamais facturé sans réservation).
  add column boosted_at timestamptz,
  add column boost_fee_cents integer not null default 0 check (boost_fee_cents between 0 and 1000),
  -- Simple identifiant (pas de clé étrangère : une 2e relation trips ↔ bookings rendrait les jointures ambiguës).
  add column boost_settled_booking uuid;
create index trips_featured_idx on public.trips (featured) where featured;

create table public.ambassador_rewards (
  id bigint generated always as identity primary key,
  traveler_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('milestone', 'referral')),
  amount_cents integer not null check (amount_cents > 0),
  milestone integer check (milestone is null or milestone > 0),
  referee_id uuid references public.profiles (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  payout_reference text check (payout_reference is null or char_length(payout_reference) <= 120),
  check ((kind = 'milestone') = (milestone is not null)),
  check ((kind = 'referral') = (referee_id is not null))
);
create index ambassador_rewards_traveler_id_idx on public.ambassador_rewards (traveler_id, created_at desc);
create index ambassador_rewards_referee_id_idx on public.ambassador_rewards (referee_id);
create index ambassador_rewards_booking_id_idx on public.ambassador_rewards (booking_id);
create index ambassador_rewards_unpaid_idx on public.ambassador_rewards (created_at) where paid_at is null;
-- Idempotence : chaque palier et chaque filleul ne rapportent qu'une fois.
create unique index ambassador_rewards_once_per_milestone on public.ambassador_rewards (traveler_id, milestone) where kind = 'milestone';
create unique index ambassador_rewards_once_per_referee on public.ambassador_rewards (referee_id) where kind = 'referral';

alter table public.ambassador_rewards enable row level security;
create policy "L'ambassadeur voit ses primes"
  on public.ambassador_rewards for select to authenticated
  using ((select auth.uid()) = traveler_id);
revoke all on public.ambassador_rewards from anon, authenticated;
grant select on public.ambassador_rewards to authenticated;

/** Livraisons réussies d'un membre en tant que voyageur. */
create function private.traveler_deliveries(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.bookings b
  join public.trips t on t.id = b.trip_id
  where t.traveler_id = p_user and b.status = 'delivered';
$$;
revoke execute on function private.traveler_deliveries(uuid) from public, anon, authenticated;

/** Recalcule le statut d'ambassadeur ; met ses trajets à venir en avant quand il l'obtient. */
create function public.refresh_ambassador(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ok boolean;
  v_was timestamptz;
begin
  select p.id_verified
         and private.traveler_deliveries(p.id) >= 3
         and coalesce((select avg(r.rating) from public.reviews r where r.subject_id = p.id), 5) >= 4.5,
         p.ambassador_since
    into v_ok, v_was
  from public.profiles p where p.id = p_user;
  if v_ok is null then
    return false;
  end if;
  if v_ok and v_was is null then
    update public.profiles set ambassador_since = now() where id = p_user;
    update public.trips set featured = true where traveler_id = p_user and status = 'published' and departure_at > now();
    insert into public.notifications (user_id, kind, title, body, href)
    values (p_user, 'ambassador', 'Vous êtes Ambassadeur Send By Me',
            'Badge sur votre profil, annonces mises en avant et primes en argent : découvrez vos avantages.', '/espace/ambassadeur');
  elsif not v_ok and v_was is not null then
    update public.profiles set ambassador_since = null where id = p_user;
  end if;
  return v_ok;
end;
$$;
revoke execute on function public.refresh_ambassador(uuid) from public, anon, authenticated;
grant execute on function public.refresh_ambassador(uuid) to service_role;

-- Livraison réussie : statut et primes de palier du voyageur.
create function private.ambassador_on_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_traveler uuid;
  v_count integer;
  v_step integer;
begin
  select traveler_id into v_traveler from public.trips where id = new.trip_id;
  if v_traveler is null or not public.refresh_ambassador(v_traveler) then
    return new;
  end if;
  v_count := private.traveler_deliveries(v_traveler);
  -- 10 € pour le palier des 3 livraisons (même si le statut arrive plus tard), puis 5 € tous les 5.
  insert into public.ambassador_rewards (traveler_id, kind, amount_cents, milestone, booking_id)
  values (v_traveler, 'milestone', 1000, 3, new.id)
  on conflict do nothing;
  if found then
    insert into public.notifications (user_id, kind, title, body, href)
    values (v_traveler, 'ambassador_reward', 'Prime de 10 € : 3 livraisons réussies',
            'Elle sera versée avec votre prochain versement.', '/espace/ambassadeur');
  end if;
  if v_count >= 8 then
    v_step := v_count - ((v_count - 3) % 5);
    insert into public.ambassador_rewards (traveler_id, kind, amount_cents, milestone, booking_id)
    values (v_traveler, 'milestone', 500, v_step, new.id)
    on conflict do nothing;
    if found then
      insert into public.notifications (user_id, kind, title, body, href)
      values (v_traveler, 'ambassador_reward', format('Prime de 5 € : %s livraisons réussies', v_step),
              'Elle sera versée avec votre prochain versement.', '/espace/ambassadeur');
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function private.ambassador_on_delivery() from public, anon, authenticated;

create trigger bookings_ambassador_on_delivery
  after update of status on public.bookings
  for each row
  when (old.status is distinct from new.status and new.status = 'delivered')
  execute function private.ambassador_on_delivery();

-- Nouvel avis, ou identité vérifiée : le statut peut changer.
create function private.ambassador_on_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_ambassador(new.subject_id);
  return new;
end;
$$;
revoke execute on function private.ambassador_on_review() from public, anon, authenticated;
create trigger reviews_ambassador
  after insert on public.reviews
  for each row execute function private.ambassador_on_review();

create function private.ambassador_on_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_ambassador(new.id);
  return new;
end;
$$;
revoke execute on function private.ambassador_on_verification() from public, anon, authenticated;
create trigger profiles_ambassador_on_verification
  after update of id_verified on public.profiles
  for each row
  when (old.id_verified is distinct from new.id_verified)
  execute function private.ambassador_on_verification();

-- Nouveau trajet : mis en avant pour un ambassadeur, et pour les 3 premiers trajets de chacun.
create function private.trips_set_featured()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.featured := exists (select 1 from public.profiles where id = new.traveler_id and ambassador_since is not null)
    or (select count(*) from public.trips where traveler_id = new.traveler_id) < 3;
  return new;
end;
$$;
revoke execute on function private.trips_set_featured() from public, anon, authenticated;
create trigger trips_set_featured
  before insert on public.trips
  for each row execute function private.trips_set_featured();

-- Parrainage : un ambassadeur reçoit 5 € en argent (au lieu de 5 € de crédit) pour chaque filleul
-- qui réussit sa première livraison. Reprend private.booking_credit_events (migration referrals).
create or replace function private.booking_credit_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member uuid;
  v_ref record;
begin
  if new.status in ('declined', 'cancelled', 'refunded') and new.discount_cents > 0 then
    insert into public.credit_entries (user_id, amount_cents, reason, booking_id)
    values (new.sender_id, new.discount_cents, 'booking_release', new.id)
    on conflict do nothing;
  end if;

  if new.status = 'delivered' then
    for v_member in
      select new.sender_id
      union
      select t.traveler_id from public.trips t where t.id = new.trip_id
    loop
      select * into v_ref from public.referrals where referee_id = v_member and status = 'pending' for update;
      if found then
        update public.referrals set status = 'rewarded', rewarded_at = now() where referee_id = v_member;
        if exists (select 1 from public.profiles where id = v_ref.referrer_id and ambassador_since is not null) then
          insert into public.ambassador_rewards (traveler_id, kind, amount_cents, referee_id, booking_id)
          values (v_ref.referrer_id, 'referral', 500, v_member, new.id)
          on conflict do nothing;
          insert into public.notifications (user_id, kind, title, body, href)
          values (v_ref.referrer_id, 'ambassador_reward', 'Prime de 5 € : un filleul a réussi sa première livraison',
                  'Elle sera versée avec votre prochain versement.', '/espace/ambassadeur');
        else
          insert into public.credit_entries (user_id, amount_cents, reason, referee_id)
          values (v_ref.referrer_id, 500, 'referral_reward', v_member)
          on conflict do nothing;
        end if;
      end if;
    end loop;
  end if;
  return new;
end;
$$;
revoke execute on function private.booking_credit_events() from public, anon, authenticated;

-- Membres déjà éligibles et trajets déjà publiés.
select public.refresh_ambassador(id) from public.profiles where id_verified;
update public.trips t set featured = true
where t.status = 'published' and t.departure_at > now()
  and (select count(*) from public.trips t2 where t2.traveler_id = t.traveler_id and t2.created_at <= t.created_at) <= 3;
