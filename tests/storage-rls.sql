-- Tests du stockage des justificatifs : psql "$DB_URL" -f tests/storage-rls.sql
\set ON_ERROR_STOP 0
\set ON_ERROR_ROLLBACK on
begin;
insert into auth.users (id, email, aud, role) values
 ('44444444-4444-4444-4444-444444444444','m@test.fr','authenticated','authenticated'),
 ('55555555-5555-5555-5555-555555555555','x@test.fr','authenticated','authenticated');
insert into storage.objects (bucket_id, name, owner_id) values ('verification-documents','44444444-4444-4444-4444-444444444444/aaaaaaaa-0000-0000-0000-000000000001.png','44444444-4444-4444-4444-444444444444');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}',true);
select count(*) as membre_relit_ses_fichiers from storage.objects where bucket_id='verification-documents';
insert into storage.objects (bucket_id, name) values ('verification-documents','55555555-5555-5555-5555-555555555555/pirate.png'); -- doit échouer
insert into storage.objects (bucket_id, name) values ('verification-documents','44444444-4444-4444-4444-444444444444/ok.png');
select 'dépôt dans son dossier : OK' as resultat;
delete from storage.objects where bucket_id='verification-documents'; -- aucun effet attendu
select count(*) as membre_voit_demandes_autres from public.identity_verifications where user_id <> '44444444-4444-4444-4444-444444444444';
select front_path from public.identity_verifications limit 1; -- colonne non autorisée : doit échouer
update public.trips set ticket_verified = true; -- doit échouer
reset role;
select count(*) as fichiers_restants_apres_delete from storage.objects where bucket_id='verification-documents' and name like '44444444%';
set local role anon;
select count(*) as anonyme_voit_fichiers from storage.objects where bucket_id='verification-documents';
rollback;
