-- Nom public toujours au format « Prénom N. », quelle que soit la source (inscription, Google, Facebook,
-- modification du profil, console). Le nom complet reste en privé dans member_contacts.last_name.

-- 1. Comptes existants : on garde le nom de famille complet en privé avant de raccourcir le nom public.
insert into public.member_contacts (user_id, last_name)
select p.id, left(rest, 80)
from (
  select id, trim(substring(regexp_replace(trim(full_name), '\s+', ' ', 'g')
    from char_length(split_part(regexp_replace(trim(full_name), '\s+', ' ', 'g'), ' ', 1)) + 1)) as rest
  from public.profiles
) p
where p.rest <> '' and p.rest !~ '^\S\.?$'
on conflict (user_id) do update
  set last_name = coalesce(public.member_contacts.last_name, excluded.last_name);

-- 2. Normalisation à chaque écriture du nom public.
create function private.profiles_public_name()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cleaned text := regexp_replace(trim(coalesce(new.full_name, '')), '\s+', ' ', 'g');
  first_part text := split_part(cleaned, ' ', 1);
  rest text := trim(substring(cleaned from char_length(first_part) + 1));
begin
  -- « EMIEL » et « emiel » deviennent « Emiel » ; « Jean-Pierre » et « Aïcha » restent tels quels.
  if upper(first_part) <> lower(first_part) and first_part in (upper(first_part), lower(first_part)) then
    first_part := initcap(lower(first_part));
  end if;
  new.full_name := case when rest = '' then first_part else first_part || ' ' || upper(left(rest, 1)) || '.' end;
  return new;
end;
$$;
revoke execute on function private.profiles_public_name() from public, anon, authenticated;

create trigger profiles_public_name
  before insert or update of full_name on public.profiles
  for each row execute function private.profiles_public_name();

-- 3. Raccourcit les noms déjà enregistrés (le déclencheur s'applique à la mise à jour).
update public.profiles
set full_name = full_name
where full_name ~ '\S\s+\S{2,}' or full_name ~ '^[[:upper:]]{2,}';
