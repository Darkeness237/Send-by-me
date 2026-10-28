-- Notifications WhatsApp : sur accord explicite du membre, vers son numéro vérifié.
alter table public.profiles add column whatsapp_notifications boolean not null default false;
grant update (whatsapp_notifications) on public.profiles to authenticated;
