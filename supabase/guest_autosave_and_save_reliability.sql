-- Guest draft autosave and atomic dashboard settings/event saves.
-- Apply after Phase 2 and all deployed wedding-settings/event feature migrations;
-- save_wedding_dashboard_transactional references the current feature columns.
-- Run this file once in the Supabase SQL Editor, then reload the schema cache.

alter table public.guests
  add column if not exists phone_input text,
  add column if not exists client_ref text;

update public.guests
set phone_input = coalesce(phone, '')
where phone_input is null;

create unique index if not exists guests_wedding_client_ref_unique
  on public.guests (wedding_id, client_ref)
  where client_ref is not null;

comment on column public.guests.phone_input is
  'Draft-safe phone value entered by the couple. guests.phone contains the canonical E.164 value only when valid.';
comment on column public.guests.client_ref is
  'Stable client-generated key used to make new guest autosave retries idempotent.';

create or replace function public.validate_and_normalize_guest_phone()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  raw_phone text;
begin
  if tg_op = 'INSERT' then
    raw_phone := coalesce(new.phone_input, new.phone, '');
  elsif new.phone_input is distinct from old.phone_input then
    raw_phone := coalesce(new.phone_input, '');
  elsif new.phone is distinct from old.phone then
    raw_phone := coalesce(new.phone, '');
  else
    raw_phone := coalesce(new.phone_input, new.phone, '');
  end if;

  raw_phone := btrim(raw_phone);
  new.phone_input := raw_phone;

  if raw_phone = '' then
    new.phone := null;
    return new;
  end if;

  begin
    new.phone := public.normalize_guest_phone_e164(raw_phone);
  exception when others then
    -- Incomplete guest records are valid drafts. Invitation actions still
    -- require a canonical phone and remain disabled in the application.
    new.phone := null;
  end;

  return new;
end;
$$;

drop trigger if exists guests_validate_phone on public.guests;
create trigger guests_validate_phone
before insert or update of phone, phone_input on public.guests
for each row execute function public.validate_and_normalize_guest_phone();

comment on function public.validate_and_normalize_guest_phone() is
  'Preserves draft phone input while maintaining guests.phone as a canonical E.164 value when valid.';

create or replace function public.save_wedding_guest_draft(
  target_wedding_id uuid,
  guest_row jsonb,
  expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  current_guest public.guests%rowtype;
  saved_guest public.guests%rowtype;
  guest_client_id text := btrim(coalesce(guest_row ->> 'id', ''));
  resolved_guest_id uuid;
  guest_invite_code text := btrim(coalesce(guest_row ->> 'invite_code', ''));
  family_size integer;
  event_refs jsonb := coalesce(guest_row -> 'invited_event_ids', '[]'::jsonb);
  event_counts jsonb := coalesce(guest_row -> 'invited_event_counts', '{}'::jsonb);
  event_ref text;
  invite_count integer;
begin
  select * into target_wedding
  from public.weddings
  where id = target_wedding_id
  for update;

  if not found then
    raise exception 'Wedding not found.' using errcode = 'P0002';
  end if;

  if auth.uid() is null
    or (target_wedding.owner_id is distinct from auth.uid() and not public.is_admin())
  then
    raise exception 'You do not have permission to update this wedding.' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(guest_row, '{}'::jsonb)) <> 'object' then
    raise exception 'Guest data must be a JSON object.' using errcode = '22023';
  end if;

  if guest_client_id = '' or guest_invite_code = '' then
    raise exception 'Guest ID and invite code are required.' using errcode = '22023';
  end if;

  begin
    family_size := (guest_row ->> 'invited_count')::integer;
  exception when others then
    raise exception 'Family Size must be a whole number.' using errcode = '22023';
  end;

  if family_size < 1 or family_size > 20 then
    raise exception 'Family Size must be between 1 and 20.' using errcode = '22023';
  end if;

  if jsonb_typeof(event_refs) <> 'array' or jsonb_typeof(event_counts) <> 'object' then
    raise exception 'Guest event assignments are invalid.' using errcode = '22023';
  end if;

  if guest_client_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    resolved_guest_id := guest_client_id::uuid;
    select * into current_guest
    from public.guests
    where id = resolved_guest_id and wedding_id = target_wedding_id
    for update;

    if not found then
      raise exception 'This guest does not belong to the selected wedding.' using errcode = '22023';
    end if;

    if expected_updated_at is not null and current_guest.updated_at is distinct from expected_updated_at then
      raise exception 'This guest was changed in another session. Reload before saving again.' using errcode = '40001';
    end if;
  else
    select * into current_guest
    from public.guests
    where wedding_id = target_wedding_id and client_ref = guest_client_id
    for update;

    if found then
      resolved_guest_id := current_guest.id;
    else
      resolved_guest_id := gen_random_uuid();
    end if;
  end if;

  if exists (
    select 1 from public.guests
    where wedding_id = target_wedding_id
      and invite_code = guest_invite_code
      and id <> resolved_guest_id
  ) then
    raise exception 'This invite code is already used by another guest.' using errcode = '23505';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(event_refs) as submitted(value)
    where submitted.value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    raise exception 'One or more selected events do not belong to this wedding.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(event_refs) as submitted(value)
    where not exists (
      select 1 from public.events
      where events.id = submitted.value::uuid
        and events.wedding_id = target_wedding_id
    )
  ) then
    raise exception 'One or more selected events do not belong to this wedding.' using errcode = '22023';
  end if;

  insert into public.guests (
    id, wedding_id, guest_name, phone, phone_input, invited_count,
    category, invite_code, meal_preference, client_ref
  )
  values (
    resolved_guest_id,
    target_wedding_id,
    coalesce(guest_row ->> 'guest_name', ''),
    nullif(guest_row ->> 'phone_input', ''),
    coalesce(guest_row ->> 'phone_input', ''),
    family_size,
    nullif(guest_row ->> 'category', ''),
    guest_invite_code,
    nullif(guest_row ->> 'meal_preference', ''),
    case when guest_client_id = resolved_guest_id::text then current_guest.client_ref else guest_client_id end
  )
  on conflict (id) do update set
    guest_name = excluded.guest_name,
    phone = excluded.phone,
    phone_input = excluded.phone_input,
    invited_count = excluded.invited_count,
    category = excluded.category,
    invite_code = excluded.invite_code,
    meal_preference = excluded.meal_preference,
    client_ref = coalesce(public.guests.client_ref, excluded.client_ref)
  returning * into saved_guest;

  delete from public.guest_event_invites
  where wedding_id = target_wedding_id and guest_id = resolved_guest_id;

  for event_ref in select distinct value from jsonb_array_elements_text(event_refs)
  loop
    begin
      invite_count := coalesce((event_counts ->> event_ref)::integer, family_size);
    exception when others then
      raise exception 'Event invitee counts must be whole numbers.' using errcode = '22023';
    end;

    if invite_count < 1 or invite_count > family_size then
      raise exception 'Event invitee counts must be between 1 and Family Size.' using errcode = '22023';
    end if;

    insert into public.guest_event_invites (wedding_id, guest_id, event_id, invited_count)
    values (target_wedding_id, resolved_guest_id, event_ref::uuid, invite_count);
  end loop;

  return jsonb_build_object(
    'success', true,
    'client_id', guest_client_id,
    'guest', to_jsonb(saved_guest),
    'guest_event_invites', coalesce((
      select jsonb_agg(to_jsonb(invite) order by invite.created_at)
      from public.guest_event_invites as invite
      where invite.wedding_id = target_wedding_id and invite.guest_id = resolved_guest_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.save_wedding_dashboard_transactional(
  target_wedding_id uuid,
  wedding_row jsonb,
  settings_row jsonb,
  event_rows jsonb,
  expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  saved_wedding public.weddings%rowtype;
  event_item jsonb;
  event_id uuid;
begin
  select * into target_wedding
  from public.weddings
  where id = target_wedding_id
  for update;

  if not found then
    raise exception 'Wedding not found.' using errcode = 'P0002';
  end if;

  if auth.uid() is null
    or (target_wedding.owner_id is distinct from auth.uid() and not public.is_admin())
  then
    raise exception 'You do not have permission to update this wedding.' using errcode = '42501';
  end if;

  if expected_updated_at is not null and target_wedding.updated_at is distinct from expected_updated_at then
    raise exception 'This wedding was changed in another session. Reload before saving again.' using errcode = '40001';
  end if;

  if jsonb_typeof(coalesce(wedding_row, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(settings_row, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(event_rows, '[]'::jsonb)) <> 'array'
  then
    raise exception 'Wedding save payload is invalid.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(event_rows, '[]'::jsonb)) as item
    where coalesce(item ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    raise exception 'One or more event IDs do not belong to this wedding.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(event_rows, '[]'::jsonb)) as item
    where not exists (
      select 1 from public.events
      where events.id = (item ->> 'id')::uuid
        and events.wedding_id = target_wedding_id
    )
  ) then
    raise exception 'One or more event IDs do not belong to this wedding.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(event_rows, '[]'::jsonb)) as item
    where nullif(btrim(item ->> 'event_key'), '') is not null
    group by lower(btrim(item ->> 'event_key'))
    having count(*) > 1
  ) then
    raise exception 'Duplicate event keys are not allowed.' using errcode = '23505';
  end if;

  update public.weddings set
    bride_name = coalesce(wedding_row ->> 'bride_name', ''),
    groom_name = coalesce(wedding_row ->> 'groom_name', ''),
    display_name = coalesce(wedding_row ->> 'display_name', ''),
    slug = coalesce(wedding_row ->> 'slug', ''),
    theme_key = coalesce(wedding_row ->> 'theme_key', target_wedding.theme_key),
    page_title = nullif(wedding_row ->> 'page_title', '')
  where id = target_wedding_id
  returning * into saved_wedding;

  insert into public.wedding_settings (
    wedding_id,
    hero_reveal_style, hero_reveal_cta_text, hero_scroll_hint_text,
    hero_video_src, hero_poster_src, hero_skip_reveal_image,
    hero_reveal_image_src, hero_reveal_image_type, hero_reveal_image_alt,
    hero_reveal_image_show_at_seconds, hero_fade_at_seconds,
    music_audio_src, music_title,
    whatsapp_invite_message, whatsapp_reminder_message,
    whatsapp_preview_title, whatsapp_preview_description, whatsapp_preview_image_src,
    couple_enabled, couple_intro_line, couple_blessing_line, couple_background_image_src,
    story_title, story_text, story_image_src, story_image_alt,
    rsvp_enabled, rsvp_title, rsvp_subtitle, rsvp_labels,
    rsvp_meal_preference_enabled, rsvp_attending_count_enabled,
    rsvp_background_image_src, rsvp_meal_options, rsvp_success_message,
    closing_enabled, closing_layout, closing_include_photos,
    closing_line, closing_couple_display_name, closing_message,
    closing_carousel_images, closing_gallery_images,
    closing_frame_image_src, closing_background_image_src
  ) values (
    target_wedding_id,
    settings_row ->> 'hero_reveal_style', settings_row ->> 'hero_reveal_cta_text', settings_row ->> 'hero_scroll_hint_text',
    settings_row ->> 'hero_video_src', settings_row ->> 'hero_poster_src', coalesce((settings_row ->> 'hero_skip_reveal_image')::boolean, false),
    settings_row ->> 'hero_reveal_image_src', settings_row ->> 'hero_reveal_image_type', settings_row ->> 'hero_reveal_image_alt',
    (settings_row ->> 'hero_reveal_image_show_at_seconds')::numeric, (settings_row ->> 'hero_fade_at_seconds')::numeric,
    settings_row ->> 'music_audio_src', settings_row ->> 'music_title',
    settings_row ->> 'whatsapp_invite_message', settings_row ->> 'whatsapp_reminder_message',
    settings_row ->> 'whatsapp_preview_title', settings_row ->> 'whatsapp_preview_description', settings_row ->> 'whatsapp_preview_image_src',
    coalesce((settings_row ->> 'couple_enabled')::boolean, true), settings_row ->> 'couple_intro_line', settings_row ->> 'couple_blessing_line', settings_row ->> 'couple_background_image_src',
    settings_row ->> 'story_title', settings_row ->> 'story_text', settings_row ->> 'story_image_src', settings_row ->> 'story_image_alt',
    coalesce((settings_row ->> 'rsvp_enabled')::boolean, true), settings_row ->> 'rsvp_title', settings_row ->> 'rsvp_subtitle', settings_row -> 'rsvp_labels',
    coalesce((settings_row ->> 'rsvp_meal_preference_enabled')::boolean, true), coalesce((settings_row ->> 'rsvp_attending_count_enabled')::boolean, true),
    settings_row ->> 'rsvp_background_image_src', settings_row -> 'rsvp_meal_options', settings_row -> 'rsvp_success_message',
    coalesce((settings_row ->> 'closing_enabled')::boolean, true), coalesce(settings_row ->> 'closing_layout', 'simple'), coalesce((settings_row ->> 'closing_include_photos')::boolean, false),
    settings_row ->> 'closing_line', settings_row ->> 'closing_couple_display_name', settings_row ->> 'closing_message',
    settings_row -> 'closing_carousel_images', settings_row -> 'closing_gallery_images',
    settings_row ->> 'closing_frame_image_src', settings_row ->> 'closing_background_image_src'
  )
  on conflict (wedding_id) do update set
    hero_reveal_style = excluded.hero_reveal_style,
    hero_reveal_cta_text = excluded.hero_reveal_cta_text,
    hero_scroll_hint_text = excluded.hero_scroll_hint_text,
    hero_video_src = excluded.hero_video_src,
    hero_poster_src = excluded.hero_poster_src,
    hero_skip_reveal_image = excluded.hero_skip_reveal_image,
    hero_reveal_image_src = excluded.hero_reveal_image_src,
    hero_reveal_image_type = excluded.hero_reveal_image_type,
    hero_reveal_image_alt = excluded.hero_reveal_image_alt,
    hero_reveal_image_show_at_seconds = excluded.hero_reveal_image_show_at_seconds,
    hero_fade_at_seconds = excluded.hero_fade_at_seconds,
    music_audio_src = excluded.music_audio_src,
    music_title = excluded.music_title,
    whatsapp_invite_message = excluded.whatsapp_invite_message,
    whatsapp_reminder_message = excluded.whatsapp_reminder_message,
    whatsapp_preview_title = excluded.whatsapp_preview_title,
    whatsapp_preview_description = excluded.whatsapp_preview_description,
    whatsapp_preview_image_src = excluded.whatsapp_preview_image_src,
    couple_enabled = excluded.couple_enabled,
    couple_intro_line = excluded.couple_intro_line,
    couple_blessing_line = excluded.couple_blessing_line,
    couple_background_image_src = excluded.couple_background_image_src,
    story_title = excluded.story_title,
    story_text = excluded.story_text,
    story_image_src = excluded.story_image_src,
    story_image_alt = excluded.story_image_alt,
    rsvp_enabled = excluded.rsvp_enabled,
    rsvp_title = excluded.rsvp_title,
    rsvp_subtitle = excluded.rsvp_subtitle,
    rsvp_labels = excluded.rsvp_labels,
    rsvp_meal_preference_enabled = excluded.rsvp_meal_preference_enabled,
    rsvp_attending_count_enabled = excluded.rsvp_attending_count_enabled,
    rsvp_background_image_src = excluded.rsvp_background_image_src,
    rsvp_meal_options = excluded.rsvp_meal_options,
    rsvp_success_message = excluded.rsvp_success_message,
    closing_enabled = excluded.closing_enabled,
    closing_layout = excluded.closing_layout,
    closing_include_photos = excluded.closing_include_photos,
    closing_line = excluded.closing_line,
    closing_couple_display_name = excluded.closing_couple_display_name,
    closing_message = excluded.closing_message,
    closing_carousel_images = excluded.closing_carousel_images,
    closing_gallery_images = excluded.closing_gallery_images,
    closing_frame_image_src = excluded.closing_frame_image_src,
    closing_background_image_src = excluded.closing_background_image_src;

  update public.events
  set event_key = null
  where wedding_id = target_wedding_id
    and id in (
      select (item ->> 'id')::uuid
      from jsonb_array_elements(coalesce(event_rows, '[]'::jsonb)) as item
    );

  for event_item in select value from jsonb_array_elements(coalesce(event_rows, '[]'::jsonb))
  loop
    event_id := (event_item ->> 'id')::uuid;
    update public.events set
      event_key = nullif(btrim(event_item ->> 'event_key'), ''),
      event_visual_key = nullif(event_item ->> 'event_visual_key', ''),
      event_text_style = coalesce(nullif(event_item ->> 'event_text_style', ''), 'auto'),
      event_text_position = case when event_item ->> 'event_text_position' = 'middle' then 'middle' else 'top' end,
      event_animation_key = coalesce(nullif(event_item ->> 'event_animation_key', ''), 'none'),
      event_show_calendar = coalesce((event_item ->> 'event_show_calendar')::boolean, true),
      event_show_invited_count = coalesce((event_item ->> 'event_show_invited_count')::boolean, false),
      event_name = coalesce(event_item ->> 'event_name', ''),
      date_label = event_item ->> 'date_label',
      start_time_label = event_item ->> 'start_time_label',
      venue_name = event_item ->> 'venue_name',
      city = event_item ->> 'city',
      maps_url = event_item ->> 'maps_url',
      dress_code = event_item ->> 'dress_code',
      foreground_image_src = event_item ->> 'foreground_image_src',
      background_image_src = event_item ->> 'background_image_src',
      calendar_title = event_item ->> 'calendar_title',
      calendar_description = event_item ->> 'calendar_description',
      sort_order = coalesce((event_item ->> 'sort_order')::integer, 0)
    where id = event_id and wedding_id = target_wedding_id;
  end loop;

  return jsonb_build_object(
    'success', true,
    'wedding_updated_at', saved_wedding.updated_at,
    'events', coalesce((
      select jsonb_agg(to_jsonb(saved_event) order by saved_event.sort_order, saved_event.created_at)
      from public.events as saved_event
      where saved_event.wedding_id = target_wedding_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.save_wedding_guest_draft(uuid, jsonb, timestamptz) from public;
revoke all on function public.save_wedding_dashboard_transactional(uuid, jsonb, jsonb, jsonb, timestamptz) from public;
grant execute on function public.save_wedding_guest_draft(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.save_wedding_dashboard_transactional(uuid, jsonb, jsonb, jsonb, timestamptz) to authenticated;

notify pgrst, 'reload schema';
