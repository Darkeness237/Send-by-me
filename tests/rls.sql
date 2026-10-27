-- Tests RLS : psql "$DB_URL" -f tests/rls.sql (tout est annulé en fin de script)
\set ON_ERROR_STOP 0
\set ON_ERROR_ROLLBACK on
begin;
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
 ('11111111-1111-1111-1111-111111111111','trav@test.fr','{"full_name":"Tra Vel"}','authenticated','authenticated'),
 ('22222222-2222-2222-2222-222222222222','send@test.fr','{"full_name":"Sen Der"}','authenticated','authenticated'),
 ('33333333-3333-3333-3333-333333333333','evil@test.fr','{}','authenticated','authenticated');
select count(*) as profiles_crees from public.profiles;
insert into public.trips (id, traveler_id, from_city, from_country, to_city, to_country, departure_at, capacity_kg, price_per_kg_cents)
 values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Paris','France','Douala','Cameroun', now()+interval '3 days', 10, 900);
insert into public.bookings (id, trip_id, sender_id, weight_kg, category, description, recipient_name, recipient_phone, base_cents, fee_cents, total_cents)
 values ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222', 4, 'clothing','Vêtements enfants','Maman','+237 699 00 00 00', 3600, 432, 4032);
insert into public.booking_secrets values ('bbbbbbbb-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','123456',0);

-- accept_booking (service_role)
set local role service_role;
select public.accept_booking('bbbbbbbb-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333') as accept_par_mauvais_voyageur;
select public.accept_booking('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111') as accept_ok;
select reserved_kg, status from public.trips;
reset role;

-- Voyageur
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',true);
select count(*) as voyageur_voit_resa from public.bookings;
select count(*) as voyageur_voit_code from public.booking_secrets;
update public.trips set reserved_kg = 0;  -- doit échouer (colonne non autorisée)
select public.accept_booking('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111'); -- doit échouer
reset role;

-- Expéditeur
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
select count(*) as expediteur_voit_code from public.booking_secrets;
update public.bookings set status='delivered'; -- doit échouer
update public.profiles set id_verified=true; -- doit échouer
insert into public.messages (booking_id, author_id, body) values ('bbbbbbbb-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','Bonjour');
select count(*) as messages from public.messages;
reset role;

-- Tiers malveillant
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',true);
select count(*) as tiers_voit_resa from public.bookings;
select count(*) as tiers_voit_messages from public.messages;
insert into public.messages (booking_id, author_id, body) values ('bbbbbbbb-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','spam'); -- doit échouer
insert into public.trips (traveler_id, from_city, from_country, to_city, to_country, departure_at, capacity_kg, price_per_kg_cents)
 values ('11111111-1111-1111-1111-111111111111','Paris','France','Dakar','Sénégal', now()+interval '3 days', 10, 900); -- usurpation, doit échouer
reset role;

-- Anonyme
set local role anon;
select count(*) as anon_voit_trajets from public.trips;
select count(*) as anon_voit_resa from public.bookings;
rollback;
