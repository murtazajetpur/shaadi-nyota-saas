-- Shaadi Nyota data integrity hardening - Phase 2.
--
-- Run after supabase/security_hardening_phase_1.sql.
-- PostgreSQL functions are transactional: any validation error or statement
-- failure rolls back every change made by that RPC call.

begin;

create or replace function public.can_manage_wedding(target_wedding_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.weddings
    where id = target_wedding_id
      and (owner_id = auth.uid() or public.is_admin())
  );
$$;

create or replace function public.save_wedding_relational_data(
  target_wedding_id uuid,
  event_rows jsonb,
  guest_rows jsonb,
  guest_mode text default 'replace'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_item jsonb;
  guest_item jsonb;
  event_client_id text;
  guest_client_id text;
  resolved_event_id uuid;
  resolved_guest_id uuid;
  removed_event_count integer := 0;
  removed_event_invite_count integer := 0;
  removed_event_rsvp_count integer := 0;
  removed_guest_count integer := 0;
  removed_guest_invite_count integer := 0;
  removed_guest_rsvp_count integer := 0;
begin
  if not public.can_manage_wedding(target_wedding_id) then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(event_rows, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(guest_rows, '[]'::jsonb)) <> 'array'
  then
    raise exception 'Events and guests must be JSON arrays.' using errcode = '22023';
  end if;

  if guest_mode not in ('replace', 'append') then
    raise exception 'Guest save mode must be replace or append.' using errcode = '22023';
  end if;

  create temporary table phase2_event_map (
    client_id text primary key,
    event_id uuid not null unique
  ) on commit drop;

  create temporary table phase2_guest_map (
    client_id text primary key,
    guest_id uuid not null unique
  ) on commit drop;

  -- Validate the complete event payload before changing any persistent row.
  if exists (
    select 1
    from jsonb_array_elements(coalesce(event_rows, '[]'::jsonb)) as item
    where nullif(btrim(item ->> 'id'), '') is null
      or nullif(btrim(item ->> 'event_name'), '') is null
  ) then
    raise exception 'Every event requires an ID and event name.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(event_rows, '[]'::jsonb)) as item
    group by item ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'Duplicate event IDs are not allowed.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(event_rows, '[]'::jsonb)) as item
    where nullif(btrim(item ->> 'event_key'), '') is not null
    group by lower(btrim(item ->> 'event_key'))
    having count(*) > 1
  ) then
    raise exception 'Duplicate event keys are not allowed.' using errcode = '22023';
  end if;

  for event_item in select value from jsonb_array_elements(coalesce(event_rows, '[]'::jsonb))
  loop
    event_client_id := btrim(event_item ->> 'id');

    if event_client_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select id into resolved_event_id
      from public.events
      where id = event_client_id::uuid
        and wedding_id = target_wedding_id;

      if resolved_event_id is null then
        raise exception 'One or more event IDs do not belong to this wedding.' using errcode = '22023';
      end if;
    else
      select id into resolved_event_id
      from public.events
      where wedding_id = target_wedding_id
        and nullif(btrim(event_item ->> 'event_key'), '') is not null
        and event_key = nullif(btrim(event_item ->> 'event_key'), '');

      resolved_event_id := coalesce(resolved_event_id, gen_random_uuid());
    end if;

    insert into phase2_event_map (client_id, event_id)
    values (event_client_id, resolved_event_id);
    resolved_event_id := null;
  end loop;

  -- Validate the complete guest payload and every assignment before mutation.
  if exists (
    select 1
    from jsonb_array_elements(coalesce(guest_rows, '[]'::jsonb)) as item
    where nullif(btrim(item ->> 'id'), '') is null
      or nullif(btrim(item ->> 'guest_name'), '') is null
      or nullif(btrim(item ->> 'invite_code'), '') is null
      or coalesce((item ->> 'invited_count')::integer, 0) < 1
      or jsonb_typeof(coalesce(item -> 'invited_event_ids', '[]'::jsonb)) <> 'array'
  ) then
    raise exception 'Every guest requires an ID, name, invite code, valid invited count, and event list.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(guest_rows, '[]'::jsonb)) as item
    group by item ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'Duplicate guest IDs are not allowed.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(guest_rows, '[]'::jsonb)) as item
    group by lower(btrim(item ->> 'invite_code'))
    having count(*) > 1
  ) then
    raise exception 'Duplicate invite codes are not allowed.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(guest_rows, '[]'::jsonb)) as guest_value
    cross join jsonb_array_elements_text(coalesce(guest_value -> 'invited_event_ids', '[]'::jsonb)) as event_ref(value)
    left join phase2_event_map on phase2_event_map.client_id = event_ref.value
    where phase2_event_map.event_id is null
  ) then
    raise exception 'One or more guest event assignments do not match the submitted wedding events.' using errcode = '22023';
  end if;

  for guest_item in select value from jsonb_array_elements(coalesce(guest_rows, '[]'::jsonb))
  loop
    guest_client_id := btrim(guest_item ->> 'id');

    if guest_client_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select id into resolved_guest_id
      from public.guests
      where id = guest_client_id::uuid
        and wedding_id = target_wedding_id;

      if resolved_guest_id is null then
        raise exception 'One or more guest IDs do not belong to this wedding.' using errcode = '22023';
      end if;
    else
      select id into resolved_guest_id
      from public.guests
      where wedding_id = target_wedding_id
        and invite_code = btrim(guest_item ->> 'invite_code');

      if guest_mode = 'append' and resolved_guest_id is not null then
        raise exception 'An imported invite code already exists.' using errcode = '23505';
      end if;

      resolved_guest_id := coalesce(resolved_guest_id, gen_random_uuid());
    end if;

    insert into phase2_guest_map (client_id, guest_id)
    values (guest_client_id, resolved_guest_id);
    resolved_guest_id := null;
  end loop;

  if exists (
    select 1
    from public.guests
    join jsonb_array_elements(coalesce(guest_rows, '[]'::jsonb)) as item
      on guests.invite_code = btrim(item ->> 'invite_code')
    left join phase2_guest_map on phase2_guest_map.client_id = (item ->> 'id')
    where guests.wedding_id = target_wedding_id
      and guests.id <> phase2_guest_map.guest_id
  ) then
    raise exception 'An invite code is already used by another guest.' using errcode = '23505';
  end if;

  -- All validation is complete. Mutations below are atomic with this RPC.
  select count(*) into removed_event_count
  from public.events
  where wedding_id = target_wedding_id
    and id not in (select event_id from phase2_event_map);

  select count(*) into removed_event_invite_count
  from public.guest_event_invites
  where wedding_id = target_wedding_id
    and event_id not in (select event_id from phase2_event_map);

  select count(*) into removed_event_rsvp_count
  from public.rsvp_responses
  where wedding_id = target_wedding_id
    and event_id not in (select event_id from phase2_event_map);

  -- Temporarily clear keys so swapping two stable event keys cannot violate
  -- the per-wedding unique constraint halfway through the transaction.
  update public.events set event_key = null where wedding_id = target_wedding_id;

  for event_item in select value from jsonb_array_elements(coalesce(event_rows, '[]'::jsonb))
  loop
    select event_id into resolved_event_id
    from phase2_event_map where client_id = (event_item ->> 'id');

    insert into public.events (
      id, wedding_id, event_key, event_visual_key, event_text_style,
      event_animation_key, event_name, date_label, start_time_label, venue_name,
      city, maps_url, dress_code, foreground_image_src, background_image_src,
      calendar_title, calendar_description, sort_order
    )
    values (
      resolved_event_id,
      target_wedding_id,
      nullif(btrim(event_item ->> 'event_key'), ''),
      nullif(event_item ->> 'event_visual_key', ''),
      coalesce(nullif(event_item ->> 'event_text_style', ''), 'auto'),
      coalesce(nullif(event_item ->> 'event_animation_key', ''), 'none'),
      btrim(event_item ->> 'event_name'),
      event_item ->> 'date_label',
      event_item ->> 'start_time_label',
      event_item ->> 'venue_name',
      event_item ->> 'city',
      event_item ->> 'maps_url',
      event_item ->> 'dress_code',
      event_item ->> 'foreground_image_src',
      event_item ->> 'background_image_src',
      event_item ->> 'calendar_title',
      event_item ->> 'calendar_description',
      coalesce((event_item ->> 'sort_order')::integer, 0)
    )
    on conflict (id) do update set
      event_key = excluded.event_key,
      event_visual_key = excluded.event_visual_key,
      event_text_style = excluded.event_text_style,
      event_animation_key = excluded.event_animation_key,
      event_name = excluded.event_name,
      date_label = excluded.date_label,
      start_time_label = excluded.start_time_label,
      venue_name = excluded.venue_name,
      city = excluded.city,
      maps_url = excluded.maps_url,
      dress_code = excluded.dress_code,
      foreground_image_src = excluded.foreground_image_src,
      background_image_src = excluded.background_image_src,
      calendar_title = excluded.calendar_title,
      calendar_description = excluded.calendar_description,
      sort_order = excluded.sort_order,
      updated_at = now();
  end loop;

  delete from public.events
  where wedding_id = target_wedding_id
    and id not in (select event_id from phase2_event_map);

  for guest_item in select value from jsonb_array_elements(coalesce(guest_rows, '[]'::jsonb))
  loop
    select guest_id into resolved_guest_id
    from phase2_guest_map where client_id = (guest_item ->> 'id');

    insert into public.guests (
      id, wedding_id, guest_name, phone, invited_count, category, invite_code,
      meal_preference
    )
    values (
      resolved_guest_id,
      target_wedding_id,
      btrim(guest_item ->> 'guest_name'),
      nullif(guest_item ->> 'phone', ''),
      (guest_item ->> 'invited_count')::integer,
      nullif(guest_item ->> 'category', ''),
      btrim(guest_item ->> 'invite_code'),
      nullif(guest_item ->> 'meal_preference', '')
    )
    on conflict (id) do update set
      guest_name = excluded.guest_name,
      phone = excluded.phone,
      invited_count = excluded.invited_count,
      category = excluded.category,
      invite_code = excluded.invite_code,
      meal_preference = excluded.meal_preference,
      updated_at = now();
  end loop;

  delete from public.guest_event_invites
  where wedding_id = target_wedding_id
    and guest_id in (select guest_id from phase2_guest_map);

  insert into public.guest_event_invites (wedding_id, guest_id, event_id)
  select distinct
    target_wedding_id,
    phase2_guest_map.guest_id,
    phase2_event_map.event_id
  from jsonb_array_elements(coalesce(guest_rows, '[]'::jsonb)) as guest_value
  join phase2_guest_map on phase2_guest_map.client_id = (guest_value ->> 'id')
  cross join jsonb_array_elements_text(coalesce(guest_value -> 'invited_event_ids', '[]'::jsonb)) as event_ref(value)
  join phase2_event_map on phase2_event_map.client_id = event_ref.value;

  if guest_mode = 'replace' then
    select count(*) into removed_guest_count
    from public.guests
    where wedding_id = target_wedding_id
      and id not in (select guest_id from phase2_guest_map);

    select count(*) into removed_guest_invite_count
    from public.guest_event_invites
    where wedding_id = target_wedding_id
      and guest_id not in (select guest_id from phase2_guest_map);

    select count(*) into removed_guest_rsvp_count
    from public.rsvp_responses
    where wedding_id = target_wedding_id
      and guest_id not in (select guest_id from phase2_guest_map);

    delete from public.guests
    where wedding_id = target_wedding_id
      and id not in (select guest_id from phase2_guest_map);
  end if;

  return jsonb_build_object(
    'success', true,
    'events', coalesce((
      select jsonb_agg(to_jsonb(event_row) order by event_row.sort_order)
      from public.events as event_row
      where event_row.wedding_id = target_wedding_id
    ), '[]'::jsonb),
    'guests', coalesce((
      select jsonb_agg(to_jsonb(guest_row) order by guest_row.created_at)
      from public.guests as guest_row
      where guest_row.wedding_id = target_wedding_id
    ), '[]'::jsonb),
    'guest_event_invites', coalesce((
      select jsonb_agg(to_jsonb(invite_row))
      from public.guest_event_invites as invite_row
      where invite_row.wedding_id = target_wedding_id
    ), '[]'::jsonb),
    'removed', jsonb_build_object(
      'events', removed_event_count,
      'event_invites', removed_event_invite_count,
      'event_rsvp_responses', removed_event_rsvp_count,
      'guests', removed_guest_count,
      'guest_invites', removed_guest_invite_count,
      'guest_rsvp_responses', removed_guest_rsvp_count
    )
  );
end;
$$;

create or replace function public.save_wedding_guests_transactional(
  target_wedding_id uuid,
  guest_rows jsonb,
  guest_mode text default 'replace'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_events jsonb;
begin
  if not public.can_manage_wedding(target_wedding_id) then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'event_key', event_key,
    'event_visual_key', event_visual_key,
    'event_text_style', event_text_style,
    'event_animation_key', event_animation_key,
    'event_name', event_name,
    'date_label', date_label,
    'start_time_label', start_time_label,
    'venue_name', venue_name,
    'city', city,
    'maps_url', maps_url,
    'dress_code', dress_code,
    'foreground_image_src', foreground_image_src,
    'background_image_src', background_image_src,
    'calendar_title', calendar_title,
    'calendar_description', calendar_description,
    'sort_order', sort_order
  ) order by sort_order), '[]'::jsonb)
  into current_events
  from public.events
  where wedding_id = target_wedding_id;

  return public.save_wedding_relational_data(target_wedding_id, current_events, guest_rows, guest_mode);
end;
$$;

create or replace function public.replace_guest_event_invites_transactional(
  target_wedding_id uuid,
  target_guest_id uuid,
  event_ids jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.can_manage_wedding(target_wedding_id) then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.guests
    where id = target_guest_id and wedding_id = target_wedding_id
  ) then
    raise exception 'Guest does not belong to this wedding.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(event_ids, '[]'::jsonb)) <> 'array' then
    raise exception 'Event IDs must be a JSON array.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements_text(coalesce(event_ids, '[]'::jsonb)) as event_ref(value)
    left join public.events
      on events.id::text = event_ref.value and events.wedding_id = target_wedding_id
    where events.id is null
  ) then
    raise exception 'One or more events do not belong to this wedding.' using errcode = '22023';
  end if;

  delete from public.guest_event_invites
  where wedding_id = target_wedding_id and guest_id = target_guest_id;

  insert into public.guest_event_invites (wedding_id, guest_id, event_id)
  select distinct target_wedding_id, target_guest_id, event_ref.value::uuid
  from jsonb_array_elements_text(coalesce(event_ids, '[]'::jsonb)) as event_ref(value);

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.delete_wedding_event_transactional(
  target_wedding_id uuid,
  target_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invite_count integer;
  response_count integer;
begin
  if not public.can_manage_wedding(target_wedding_id) then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.events where id = target_event_id and wedding_id = target_wedding_id
  ) then
    raise exception 'Event does not belong to this wedding.' using errcode = '22023';
  end if;

  select count(*) into invite_count from public.guest_event_invites where event_id = target_event_id;
  select count(*) into response_count from public.rsvp_responses where event_id = target_event_id;
  delete from public.events where id = target_event_id and wedding_id = target_wedding_id;

  return jsonb_build_object(
    'success', true,
    'removed_guest_invites', invite_count,
    'removed_rsvp_responses', response_count
  );
end;
$$;

create or replace function public.delete_wedding_guests_transactional(
  target_wedding_id uuid,
  guest_ids jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
  invite_count integer;
  response_count integer;
begin
  if not public.can_manage_wedding(target_wedding_id) then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(guest_ids, '[]'::jsonb)) <> 'array' then
    raise exception 'Guest IDs must be a JSON array.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements_text(coalesce(guest_ids, '[]'::jsonb)) as guest_ref(value)
    left join public.guests
      on guests.id::text = guest_ref.value and guests.wedding_id = target_wedding_id
    where guests.id is null
  ) then
    raise exception 'One or more guests do not belong to this wedding.' using errcode = '22023';
  end if;

  select count(*) into invite_count
  from public.guest_event_invites
  where guest_id in (select value::uuid from jsonb_array_elements_text(coalesce(guest_ids, '[]'::jsonb)));
  select count(*) into response_count
  from public.rsvp_responses
  where guest_id in (select value::uuid from jsonb_array_elements_text(coalesce(guest_ids, '[]'::jsonb)));

  delete from public.guests
  where wedding_id = target_wedding_id
    and id in (select value::uuid from jsonb_array_elements_text(coalesce(guest_ids, '[]'::jsonb)));
  get diagnostics deleted_count = row_count;

  return jsonb_build_object(
    'success', true,
    'deleted_guests', deleted_count,
    'removed_guest_invites', invite_count,
    'removed_rsvp_responses', response_count
  );
end;
$$;

revoke all on function public.can_manage_wedding(uuid) from public;
revoke all on function public.save_wedding_relational_data(uuid, jsonb, jsonb, text) from public;
revoke all on function public.save_wedding_guests_transactional(uuid, jsonb, text) from public;
revoke all on function public.replace_guest_event_invites_transactional(uuid, uuid, jsonb) from public;
revoke all on function public.delete_wedding_event_transactional(uuid, uuid) from public;
revoke all on function public.delete_wedding_guests_transactional(uuid, jsonb) from public;

grant execute on function public.save_wedding_relational_data(uuid, jsonb, jsonb, text) to authenticated;
grant execute on function public.save_wedding_guests_transactional(uuid, jsonb, text) to authenticated;
grant execute on function public.replace_guest_event_invites_transactional(uuid, uuid, jsonb) to authenticated;
grant execute on function public.delete_wedding_event_transactional(uuid, uuid) to authenticated;
grant execute on function public.delete_wedding_guests_transactional(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;

-- Rollback notes:
-- Dropping these RPCs restores the previous frontend contract, but does not
-- recover data lost by legacy partial-save code. Keep the Phase 1 security
-- functions and policies installed.
