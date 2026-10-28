-- Empreintes des photos du colis : on refuse qu'une même photo (ou une copie retouchée) serve
-- pour plusieurs étapes, ou qu'une photo d'un autre envoi soit réutilisée.
alter table public.booking_photos
  add column content_hash text check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$'),
  add column phash text check (phash is null or phash ~ '^[0-9a-f]{16}$');
create index booking_photos_content_hash_idx on public.booking_photos (content_hash);
create index booking_photos_phash_idx on public.booking_photos (phash);
