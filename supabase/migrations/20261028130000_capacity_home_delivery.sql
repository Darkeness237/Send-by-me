-- Les voyageurs peuvent emporter plusieurs valises : jusqu'à 300 kg par trajet et par colis.
alter table public.trips drop constraint trips_capacity_kg_check;
alter table public.trips add constraint trips_capacity_kg_check check (capacity_kg > 0 and capacity_kg <= 300);
alter table public.bookings drop constraint bookings_weight_kg_check;
alter table public.bookings add constraint bookings_weight_kg_check check (weight_kg > 0 and weight_kg <= 300);

-- Livraison à domicile proposée sur tous les trajets : c'est l'expéditeur qui la choisit
-- s'il ne peut pas se rendre au point de rendez-vous. Le voyageur fixe seulement le forfait.
update public.trips set home_delivery_cents = 1000 where home_delivery_cents is null;
alter table public.trips alter column home_delivery_cents set default 1000;
alter table public.trips alter column home_delivery_cents set not null;
