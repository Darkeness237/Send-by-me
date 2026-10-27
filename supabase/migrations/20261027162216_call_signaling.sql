-- Appels audio/vidéo dans la messagerie : signalisation WebRTC via Realtime Broadcast.
-- Canal privé « call:<id de réservation> » : seuls l'expéditeur et le voyageur peuvent le rejoindre et y écrire.

-- Extrait l'id de réservation d'un topic « call:<uuid> », ou null si le format est invalide.
create function private.call_booking_id(p_topic text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_topic ~ '^call:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then substring(p_topic from 6)::uuid
  end;
$$;
revoke execute on function private.call_booking_id(text) from public, anon;
grant execute on function private.call_booking_id(text) to authenticated;

create policy "Participants : recevoir la signalisation d'appel"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select private.is_booking_party(private.call_booking_id((select realtime.topic()))))
  );

create policy "Participants : envoyer la signalisation d'appel"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and (select private.is_booking_party(private.call_booking_id((select realtime.topic()))))
  );
