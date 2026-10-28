-- Photos du colis à chaque étape, pour prouver que c'est bien le même colis du départ à l'arrivée :
--   expéditeur : contenu avant emballage, puis colis emballé ;
--   voyageur   : colis emballé à la prise en charge ;
--   arrivée    : colis encore emballé, puis ouvert devant le destinataire.
-- Photos privées : visibles seulement par l'expéditeur, le voyageur et l'équipe.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('parcel-photos', 'parcel-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Dossier = identifiant de la réservation ; seuls ses participants y déposent et y lisent.
create policy "Photos d'envoi : dépôt par les participants"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'parcel-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    and (select private.is_booking_party(((storage.foldername(name))[1])::uuid))
  );
create policy "Photos d'envoi : lecture par les participants"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'parcel-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    and (select private.is_booking_party(((storage.foldername(name))[1])::uuid))
  );

create table public.booking_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('contents', 'packed', 'pickup', 'arrival_packed', 'arrival_opened')),
  path text not null check (char_length(path) <= 300),
  created_at timestamptz not null default now()
);
create index booking_photos_booking_id_idx on public.booking_photos (booking_id, created_at);
create index booking_photos_author_id_idx on public.booking_photos (author_id);

alter table public.booking_photos enable row level security;
create policy "Les participants voient les photos du colis"
  on public.booking_photos for select to authenticated
  using ((select private.is_booking_party(booking_id)));
-- Enregistrement par le serveur, qui contrôle l'étape et le rôle de chacun.
revoke all on public.booking_photos from anon, authenticated;
grant select on public.booking_photos to authenticated;
