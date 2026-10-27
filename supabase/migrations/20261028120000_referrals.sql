-- Parrainage : chaque membre a un code à partager. Le filleul reçoit un crédit de bienvenue
-- utilisable sur les frais de service ; le parrain reçoit le sien quand le filleul a réalisé
-- sa première livraison (envoi livré ou colis transporté). Les crédits ne réduisent que la
-- commission Send By Me, jamais la part du voyageur.
-- Montant : 5 € des deux côtés (garder en phase avec REFERRAL_REWARD_CENTS dans src/lib/referral.ts).

-- ─────────────────────────────────────────────────────────────
-- Codes
-- ─────────────────────────────────────────────────────────────
create function private.new_referral_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sans 0/O ni 1/I
  code text;
begin
  loop
    code := '';
    for i in 1..7 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;
revoke execute on function private.new_referral_code() from public, anon, authenticated;

alter table public.profiles add column referral_code text unique check (referral_code ~ '^[A-Z0-9]{6,12}$');
update public.profiles set referral_code = private.new_referral_code() where referral_code is null;
alter table public.profiles alter column referral_code set default private.new_referral_code();
alter table public.profiles alter column referral_code set not null;

create table public.referrals (
  referee_id uuid primary key references public.profiles (id) on delete cascade, -- un seul parrain par membre
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'rewarded')),
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  check (referee_id <> referrer_id)
);
create index referrals_referrer_id_idx on public.referrals (referrer_id);

alter table public.referrals enable row level security;
create policy "Le parrain et le filleul voient le parrainage"
  on public.referrals for select to authenticated
  using ((select auth.uid()) in (referrer_id, referee_id));
revoke all on public.referrals from anon, authenticated;
grant select on public.referrals to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Crédits (journal : le solde est la somme des lignes)
-- ─────────────────────────────────────────────────────────────
create table public.credit_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents <> 0),
  reason text not null check (reason in ('referral_welcome', 'referral_reward', 'booking', 'booking_release')),
  booking_id uuid references public.bookings (id) on delete set null,
  referee_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index credit_entries_user_id_idx on public.credit_entries (user_id);
create index credit_entries_booking_id_idx on public.credit_entries (booking_id);
create index credit_entries_referee_id_idx on public.credit_entries (referee_id);
-- Idempotence : une seule utilisation et une seule restitution par réservation, une seule récompense par filleul.
create unique index credit_entries_once_per_booking on public.credit_entries (booking_id, reason) where booking_id is not null;
create unique index credit_entries_once_per_referee on public.credit_entries (referee_id, reason) where referee_id is not null;

alter table public.credit_entries enable row level security;
create policy "Le membre voit ses crédits"
  on public.credit_entries for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.credit_entries from anon, authenticated;
grant select on public.credit_entries to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Parrainage à l'inscription
-- ─────────────────────────────────────────────────────────────
/** Rattache un nouveau membre à son parrain et lui offre le crédit de bienvenue. */
create function public.attach_referral(p_referee uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referrer uuid;
begin
  select id into v_referrer from public.profiles where referral_code = upper(trim(p_code));
  if v_referrer is null or v_referrer = p_referee then
    return false;
  end if;
  insert into public.referrals (referee_id, referrer_id) values (p_referee, v_referrer) on conflict do nothing;
  if not found then
    return false;
  end if;
  insert into public.credit_entries (user_id, amount_cents, reason, referee_id)
  values (p_referee, 500, 'referral_welcome', p_referee)
  on conflict do nothing;
  return true;
end;
$$;
revoke execute on function public.attach_referral(uuid, text) from public, anon, authenticated;
grant execute on function public.attach_referral(uuid, text) to service_role;

-- Inscription par e-mail : le code est transmis dans les métadonnées.
create function private.handle_new_user_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'referral_code', '') <> '' then
    perform public.attach_referral(new.id, new.raw_user_meta_data ->> 'referral_code');
  end if;
  return new;
end;
$$;
revoke execute on function private.handle_new_user_referral() from public, anon, authenticated;

-- Après la création du profil (les déclencheurs s'exécutent par ordre alphabétique).
create trigger on_auth_user_created_referral
  after insert on auth.users
  for each row execute function private.handle_new_user_referral();

-- ─────────────────────────────────────────────────────────────
-- Utilisation du crédit sur une réservation
-- ─────────────────────────────────────────────────────────────
alter table public.bookings add column discount_cents integer not null default 0 check (discount_cents >= 0);
alter table public.bookings drop constraint bookings_total_check;
alter table public.bookings add constraint bookings_total_check
  check (total_cents = base_cents + delivery_cents + fee_cents - discount_cents and discount_cents <= fee_cents);

/** Applique le crédit disponible (plafonné à la commission) sur une réservation en attente. Renvoie la remise. */
create function public.apply_booking_credit(p_booking_id uuid, p_max_cents integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender uuid;
  v_balance integer;
  v_discount integer;
begin
  select sender_id into v_sender from public.bookings where id = p_booking_id and status = 'pending' and discount_cents = 0;
  if v_sender is null then
    return 0;
  end if;
  -- Verrou par membre : deux réservations simultanées ne consomment pas le même crédit.
  perform pg_advisory_xact_lock(hashtextextended(v_sender::text, 0));
  select coalesce(sum(amount_cents), 0) into v_balance from public.credit_entries where user_id = v_sender;
  v_discount := least(v_balance, greatest(p_max_cents, 0));
  if v_discount <= 0 then
    return 0;
  end if;
  update public.bookings
    set discount_cents = v_discount, total_cents = total_cents - v_discount
    where id = p_booking_id;
  insert into public.credit_entries (user_id, amount_cents, reason, booking_id)
  values (v_sender, -v_discount, 'booking', p_booking_id);
  return v_discount;
end;
$$;
revoke execute on function public.apply_booking_credit(uuid, integer) from public, anon, authenticated;
grant execute on function public.apply_booking_credit(uuid, integer) to service_role;

-- Réservation refusée, annulée ou remboursée : le crédit est rendu.
-- Première livraison d'un filleul : le parrain est récompensé.
create function private.booking_credit_events()
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
        insert into public.credit_entries (user_id, amount_cents, reason, referee_id)
        values (v_ref.referrer_id, 500, 'referral_reward', v_member)
        on conflict do nothing;
      end if;
    end loop;
  end if;
  return new;
end;
$$;
revoke execute on function private.booking_credit_events() from public, anon, authenticated;

create trigger bookings_credit_events
  after update of status on public.bookings
  for each row
  when (old.status is distinct from new.status)
  execute function private.booking_credit_events();
