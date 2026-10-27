-- Vérification d'identité des membres et justificatifs de voyage.
-- Les fichiers vont dans un bucket PRIVÉ, rangés par utilisateur (<uid>/...).
-- Le membre peut déposer ses fichiers mais ni les relire ni les remplacer ;
-- seule l'équipe (clé secrète côté serveur) les consulte, puis les supprime après contrôle.

-- ─────────────────────────────────────────────────────────────
-- Stockage
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-documents',
  'verification-documents',
  false,
  10485760, -- 10 Mo
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Dépôt de ses propres justificatifs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
-- Pas de politique select / update / delete : personne ne lit ces fichiers depuis le navigateur.

-- ─────────────────────────────────────────────────────────────
-- Demandes de vérification d'identité
-- ─────────────────────────────────────────────────────────────
create type public.verification_status as enum ('pending', 'approved', 'rejected');

create table public.identity_verifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_type text not null check (document_type in ('cni', 'passport', 'residence_permit', 'driving_license')),
  front_path text check (front_path is null or char_length(front_path) <= 300),
  back_path text check (back_path is null or char_length(back_path) <= 300),
  selfie_path text check (selfie_path is null or char_length(selfie_path) <= 300),
  status public.verification_status not null default 'pending',
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null
);
create index identity_verifications_user_id_idx on public.identity_verifications (user_id, created_at desc);
create index identity_verifications_reviewed_by_idx on public.identity_verifications (reviewed_by);
-- Une seule demande en attente par membre.
create unique index identity_verifications_one_pending on public.identity_verifications (user_id) where status = 'pending';

alter table public.identity_verifications enable row level security;

create policy "Le membre voit l'état de ses demandes"
  on public.identity_verifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Création, décision et suppression des fichiers : uniquement par le serveur.
revoke all on public.identity_verifications from anon, authenticated;
grant select (id, user_id, document_type, status, rejection_reason, created_at, reviewed_at)
  on public.identity_verifications to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Justificatifs de voyage (billet, carte d'embarquement)
-- ─────────────────────────────────────────────────────────────
create table public.trip_proofs (
  trip_id uuid primary key references public.trips (id) on delete cascade,
  traveler_id uuid not null references public.profiles (id) on delete cascade,
  file_path text check (file_path is null or char_length(file_path) <= 300),
  status public.verification_status not null default 'pending',
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index trip_proofs_traveler_id_idx on public.trip_proofs (traveler_id);
create index trip_proofs_pending_idx on public.trip_proofs (created_at) where status = 'pending';

alter table public.trip_proofs enable row level security;

create policy "Le voyageur voit l'état de ses justificatifs"
  on public.trip_proofs for select
  to authenticated
  using ((select auth.uid()) = traveler_id);

revoke all on public.trip_proofs from anon, authenticated;
grant select (trip_id, traveler_id, status, rejection_reason, created_at, reviewed_at) on public.trip_proofs to authenticated;

-- Badge public « trajet vérifié » (modifiable uniquement par le serveur : absent des droits par colonne).
alter table public.trips add column ticket_verified boolean not null default false;
