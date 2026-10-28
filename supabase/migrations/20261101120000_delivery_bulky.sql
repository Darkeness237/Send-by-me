-- Livraison à domicile : colis léger mais encombrant, facturé au volume par le partenaire.
alter table public.booking_deliveries add column bulky boolean not null default false;
