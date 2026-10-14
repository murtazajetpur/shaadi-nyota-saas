-- Shaadi Nyota MVP schema for Supabase Postgres.
-- Paste this into the Supabase SQL editor before running seed.sql.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'couple' check (role in ('couple', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application profile for Supabase Auth users.';
comment on column public.profiles.role is 'MVP roles: couple or admin.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_phone_idx on public.profiles(phone);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  theme_key text not null unique,
  display_name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.themes is 'Available invite themes. Seed palace-door-opening first.';

create index if not exists themes_is_active_idx on public.themes(is_active);

create table if not exists public.weddings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  slug text not null unique,
  package_type text not null check (package_type in ('basic', 'rsvp', 'whatsapp')),
  status text not null default 'draft' check (status in ('draft', 'published', 'suspended')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'manual_pending', 'ref_pending', 'paid')),
  theme_key text not null references public.themes(theme_key),
  page_title text,
  bride_name text,
  groom_name text,
  display_name text,
  guest_record_limit integer not null default 2000 check (guest_record_limit between 1 and 10000),
  invitee_limit integer not null default 10000 check (invitee_limit between 1 and 100000),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.weddings is 'Main wedding record and route identity.';
comment on column public.weddings.owner_id is 'Couple/user who owns the wedding.';
comment on column public.weddings.created_by is 'User/admin who created the wedding record.';
comment on column public.weddings.package_type is 'Internal values include active basic/rsvp plans plus a legacy compatibility value. Active purchasable plans are basic and rsvp.';
comment on column public.weddings.payment_status is 'Manual payment workflow values: unpaid, manual_pending, ref_pending, paid.';
comment on column public.weddings.guest_record_limit is 'Maximum guest/family records. Default 2000; admins may override up to 10000.';
comment on column public.weddings.invitee_limit is 'Maximum total people across Family Size values. Default 10000; admins may override up to 100000.';
comment on column public.weddings.published_at is 'Set when status first changes to published.';

create trigger weddings_set_updated_at
before update on public.weddings
for each row execute function public.set_updated_at();

create index if not exists weddings_owner_id_idx on public.weddings(owner_id);
create index if not exists weddings_created_by_idx on public.weddings(created_by);
create index if not exists weddings_status_idx on public.weddings(status);
create index if not exists weddings_payment_status_idx on public.weddings(payment_status);
create index if not exists weddings_package_type_idx on public.weddings(package_type);

create or replace function public.protect_wedding_control_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_guest_count integer;
  current_people_count integer;
begin
  if new.guest_record_limit is distinct from old.guest_record_limit
    or new.invitee_limit is distinct from old.invitee_limit
  then
    select count(*)::integer, coalesce(sum(invited_count), 0)::integer
    into current_guest_count, current_people_count
    from public.guests
    where wedding_id = old.id;

    if new.guest_record_limit < current_guest_count then
      raise exception 'Guest entry limit cannot be below the current guest count of %.', current_guest_count
        using errcode = '22023';
    end if;

    if new.invitee_limit < current_people_count then
      raise exception 'Total people limit cannot be below the current people count of %.', current_people_count
        using errcode = '22023';
    end if;
  end if;

  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.package_type is distinct from old.package_type
    or new.status is distinct from old.status
    or new.published_at is distinct from old.published_at
    or new.owner_id is distinct from old.owner_id
    or new.created_by is distinct from old.created_by
    or new.guest_record_limit is distinct from old.guest_record_limit
    or new.invitee_limit is distinct from old.invitee_limit
  then
    raise exception 'Only an admin can change wedding plan, publication, ownership, or guest capacity fields.'
      using errcode = '42501';
  end if;

  if new.payment_status is distinct from old.payment_status
    and coalesce(current_setting('app.allow_payment_verification_request', true), '') <> 'on'
  then
    raise exception 'Use request_payment_verification to change payment verification status.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists weddings_protect_control_fields on public.weddings;
create trigger weddings_protect_control_fields
before update on public.weddings
for each row execute function public.protect_wedding_control_fields();

create table if not exists public.wedding_settings (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null unique references public.weddings(id) on delete cascade,
  hero_reveal_style text default 'envelope' check (hero_reveal_style in ('envelope', 'scroll', 'palace-door')),
  hero_reveal_cta_text text,
  hero_scroll_hint_text text,
  hero_video_src text,
  hero_poster_src text,
  hero_skip_reveal_image boolean not null default false,
  hero_reveal_image_src text,
  hero_reveal_image_type text default 'blessing' check (hero_reveal_image_type in ('blessing', 'couple', 'floral')),
  hero_reveal_image_alt text,
  hero_reveal_image_show_at_seconds numeric,
  hero_fade_at_seconds numeric,
  music_audio_src text,
  music_title text,
  whatsapp_invite_message text,
  whatsapp_reminder_message text,
  whatsapp_preview_title text,
  whatsapp_preview_description text,
  whatsapp_preview_image_src text,
  couple_enabled boolean not null default true,
  couple_intro_line text,
  couple_blessing_line text,
  couple_background_image_src text,
  story_title text,
  story_text text,
  story_image_src text,
  story_image_alt text,
  rsvp_enabled boolean not null default true,
  rsvp_title text,
  rsvp_subtitle text,
  rsvp_labels jsonb,
  rsvp_meal_preference_enabled boolean not null default true,
  rsvp_attending_count_enabled boolean not null default true,
  rsvp_background_image_src text,
  rsvp_meal_options jsonb,
  rsvp_success_message jsonb,
  closing_enabled boolean not null default true,
  closing_layout text not null default 'gallery' check (closing_layout in ('simple', 'gallery')),
  closing_include_photos boolean not null default false,
  closing_line text,
  closing_couple_display_name text,
  closing_message text,
  closing_carousel_images jsonb,
  closing_gallery_images jsonb,
  closing_frame_image_src text,
  closing_background_image_src text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wedding_settings is 'Configurable invite copy and media paths for one wedding.';
comment on column public.wedding_settings.rsvp_labels is 'JSON object for RSVP prompt labels and placeholders.';
comment on column public.wedding_settings.rsvp_meal_options is 'JSON object for veg, nonVeg, and jain labels.';
comment on column public.wedding_settings.closing_carousel_images is 'JSON array of closing carousel asset URLs/paths.';

create trigger wedding_settings_set_updated_at
before update on public.wedding_settings
for each row execute function public.set_updated_at();

create table if not exists public.wedding_media (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  thumbnail_path text not null,
  thumbnail_url text not null,
  original_filename text not null default '',
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  thumbnail_size_bytes bigint not null default 0 check (thumbnail_size_bytes >= 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  initial_section text not null default 'shared' check (
    initial_section in ('opening-reveal', 'our-story', 'events', 'rsvp', 'closing-gallery', 'whatsapp', 'shared')
  ),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (wedding_id, storage_path)
);

comment on table public.wedding_media is 'Reusable wedding-scoped media metadata. Binary files live in the wedding-assets Storage bucket.';

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  event_key text,
  event_visual_key text,
  event_text_style text not null default 'auto' check (event_text_style in ('auto', 'light', 'dark')),
  event_text_position text not null default 'top' check (event_text_position in ('top', 'middle')),
  event_animation_key text not null default 'none',
  event_show_calendar boolean not null default true,
  event_show_invited_count boolean not null default false,
  event_name text not null,
  date_label text,
  start_time_label text,
  venue_name text,
  city text,
  maps_url text,
  dress_code text,
  foreground_image_src text,
  background_image_src text,
  calendar_title text,
  calendar_description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, event_key)
);

comment on table public.events is 'Wedding functions/events shown on the invite.';
comment on column public.events.date_label is 'MVP display label. Add event_start_at before scheduled notifications.';
comment on column public.events.start_time_label is 'MVP display label. Add timezone-aware datetime fields before scheduled notifications.';

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create index if not exists events_wedding_sort_idx on public.events(wedding_id, sort_order);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_name text not null,
  phone text,
  invited_count integer not null default 1 check (invited_count between 1 and 20),
  category text,
  invite_code text not null,
  meal_preference text check (meal_preference in ('veg', 'nonVeg', 'jain')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, invite_code)
);


create or replace function public.normalize_guest_phone_e164(input_phone text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  cleaned text := btrim(coalesce(input_phone, ''));
  digits text;
  canonical text;
begin
  -- Spreadsheet-safe CSV exports may prefix a plus value with an apostrophe.
  cleaned := regexp_replace(cleaned, '^''+\s*', '');
  digits := regexp_replace(cleaned, '[^0-9]', '', 'g');

  if digits = '' then
    return null;
  end if;

  if cleaned ~ '^\s*00' then
    canonical := '+' || substring(digits from 3);
  elsif cleaned ~ '^\s*\+' then
    canonical := '+' || digits;
  elsif length(digits) = 10 and digits ~ '^[6-9][0-9]{9}$' then
    canonical := '+91' || digits;
  elsif length(digits) = 11 and digits ~ '^0[6-9][0-9]{9}$' then
    canonical := '+91' || substring(digits from 2);
  else
    canonical := '+' || digits;
  end if;

  if canonical !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Guest phone number is invalid. Use E.164 format or a 10-digit Indian mobile number.';
  end if;

  if canonical like '+91%' and canonical !~ '^\+91[6-9][0-9]{9}$' then
    raise exception 'Guest phone number is invalid. Indian mobile numbers must start with 6, 7, 8, or 9.';
  end if;

  if regexp_replace(canonical, '[^0-9]', '', 'g') ~ '^([0-9])\1+$' then
    raise exception 'Guest phone number is invalid.';
  end if;

  return canonical;
end;
$$;

create or replace function public.validate_and_normalize_guest_phone()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  normalized_phone text;
begin
  normalized_phone := public.normalize_guest_phone_e164(new.phone);

  if normalized_phone is null then
    -- Preserve legacy rows that already have no phone, but do not allow new missing
    -- phones or removal of a previously saved phone number.
    if tg_op = 'INSERT' then
      raise exception 'Guest phone number is required.';
    end if;
    if btrim(coalesce(old.phone, '')) <> '' then
      raise exception 'Guest phone number is required.';
    end if;
    return new;
  end if;

  new.phone := normalized_phone;
  return new;
end;
$$;

drop trigger if exists guests_validate_phone on public.guests;
create trigger guests_validate_phone
before insert or update of phone on public.guests
for each row execute function public.validate_and_normalize_guest_phone();

comment on function public.normalize_guest_phone_e164(text) is
  'Normalizes guest phone input to E.164-compatible text. Ten-digit local values default to India.';
comment on function public.validate_and_normalize_guest_phone() is
  'Validates and canonicalizes guests.phone for every write path.';

revoke all on function public.normalize_guest_phone_e164(text) from public;
revoke all on function public.validate_and_normalize_guest_phone() from public;
grant execute on function public.normalize_guest_phone_e164(text) to authenticated;

comment on table public.guests is 'Guest/family records and personalized invite codes.';
comment on column public.guests.meal_preference is 'Stored once per guest/family, not per event.';

create trigger guests_set_updated_at
before update on public.guests
for each row execute function public.set_updated_at();

create index if not exists guests_wedding_id_idx on public.guests(wedding_id);
create index if not exists guests_phone_idx on public.guests(phone);
create index if not exists guests_category_idx on public.guests(category);
create or replace function public.enforce_wedding_guest_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  current_guest_count integer;
  current_people_count integer;
begin
  if coalesce(current_setting('app.guest_capacity_validated_for', true), '') = new.wedding_id::text then
    return new;
  end if;

  select * into target_wedding
  from public.weddings
  where id = new.wedding_id
  for update;

  if new.invited_count > 20 then
    raise exception 'Family Size cannot be more than 20 for one guest entry.' using errcode = '22023';
  end if;

  select count(*)::integer, coalesce(sum(invited_count), 0)::integer
  into current_guest_count, current_people_count
  from public.guests
  where wedding_id = new.wedding_id
    and id <> new.id;

  if current_guest_count + 1 > target_wedding.guest_record_limit then
    raise exception 'Guest entry limit of % exceeded.', target_wedding.guest_record_limit using errcode = '22023';
  end if;

  if current_people_count + new.invited_count > target_wedding.invitee_limit then
    raise exception 'Total people limit of % exceeded.', target_wedding.invitee_limit using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists guests_enforce_wedding_capacity on public.guests;
create trigger guests_enforce_wedding_capacity
before insert or update of wedding_id, invited_count on public.guests
for each row execute function public.enforce_wedding_guest_capacity();

create table if not exists public.guest_event_invites (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  invited_count integer not null default 1 check (invited_count between 1 and 20),
  invitee_count_display_mode text check (invitee_count_display_mode in ('all', 'number')),
  created_at timestamptz not null default now(),
  unique (guest_id, event_id)
);

comment on table public.guest_event_invites is 'Join table for guest-wise event visibility.';
comment on column public.guest_event_invites.invitee_count_display_mode is
  'Explicit All or numeric display override. Null preserves the legacy default: All when event count matches Family Size, and numeric when it differs.';

create index if not exists guest_event_invites_wedding_id_idx on public.guest_event_invites(wedding_id);
create index if not exists guest_event_invites_event_id_idx on public.guest_event_invites(event_id);

create table if not exists public.guest_message_history (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  message_type text not null check (message_type in ('invitation', 'reminder')),
  message_snapshot text not null default '',
  sent_at timestamptz not null default now(),
  recorded_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

comment on table public.guest_message_history is 'Manual audit log for guest WhatsApp invitations and reminders.';

create index if not exists guest_message_history_wedding_id_idx on public.guest_message_history(wedding_id);
create index if not exists guest_message_history_guest_sent_idx on public.guest_message_history(guest_id, sent_at desc);

create or replace function public.validate_guest_message_history_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.guests
    where guests.id = new.guest_id
      and guests.wedding_id = new.wedding_id
  ) then
    raise exception 'Guest does not belong to this wedding.' using errcode = '23503';
  end if;

  return new;
end;
$$;

drop trigger if exists guest_message_history_validate_scope on public.guest_message_history;
create trigger guest_message_history_validate_scope
before insert or update of wedding_id, guest_id on public.guest_message_history
for each row execute function public.validate_guest_message_history_scope();


create table if not exists public.rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null check (status in ('yes', 'no', 'maybe')),
  attending_count integer not null default 0 check (attending_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guest_id, event_id)
);

comment on table public.rsvp_responses is 'Event-wise RSVP status. Pending is derived by missing rows.';
comment on column public.rsvp_responses.status is 'MVP values: yes, no, maybe.';

create trigger rsvp_responses_set_updated_at
before update on public.rsvp_responses
for each row execute function public.set_updated_at();

create index if not exists rsvp_responses_wedding_id_idx on public.rsvp_responses(wedding_id);
create index if not exists rsvp_responses_event_status_idx on public.rsvp_responses(event_id, status);
create index if not exists rsvp_responses_guest_id_idx on public.rsvp_responses(guest_id);

create or replace function public.request_payment_verification(wedding_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
begin
  select * into target_wedding
  from public.weddings
  where id = $1 and owner_id = auth.uid();

  if not found then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;
  if target_wedding.payment_status = 'paid' then
    return jsonb_build_object('success', false, 'payment_status', 'paid', 'message', 'Payment is already verified.');
  end if;

  perform set_config('app.allow_payment_verification_request', 'on', true);
  update public.weddings set payment_status = 'manual_pending' where id = target_wedding.id;
  return jsonb_build_object('success', true, 'payment_status', 'manual_pending');
end;
$$;

create or replace function public.get_public_wedding_route_status(wedding_slug text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when not exists (
      select 1
      from public.weddings as wedding
      where wedding.slug = btrim(coalesce(wedding_slug, ''))
    ) then 'not_found'
    when exists (
      select 1
      from public.weddings as wedding
      where wedding.slug = btrim(coalesce(wedding_slug, ''))
        and wedding.status = 'published'
        and wedding.payment_status = 'paid'
    ) then 'live'
    else 'not_live'
  end;
$$;

comment on function public.get_public_wedding_route_status(text) is
  'Returns live, not_live, or not_found for guest-facing route messaging without exposing wedding metadata.';

create or replace function public.get_public_invite_by_code(wedding_slug text, invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  target_guest public.guests%rowtype;
begin
  select * into target_wedding
  from public.weddings
  where slug = $1 and status = 'published' and payment_status = 'paid';
  if not found then return null; end if;

  select * into target_guest
  from public.guests
  where wedding_id = target_wedding.id and guests.invite_code = $2;
  if not found then return null; end if;

  return jsonb_build_object(
    'wedding', to_jsonb(target_wedding) - 'owner_id' - 'created_by',
    'settings', (select to_jsonb(settings) from public.wedding_settings as settings where settings.wedding_id = target_wedding.id),
    'guest', to_jsonb(target_guest),
    'events', coalesce((
      select jsonb_agg((to_jsonb(event_row) || jsonb_build_object(
        'guest_invited_count', coalesce(invite.invited_count, target_guest.invited_count, 1),
        'guest_invitee_count_display_mode', invite.invitee_count_display_mode
      )) order by event_row.sort_order)
      from public.events as event_row
      join public.guest_event_invites as invite
        on invite.wedding_id = target_wedding.id
       and invite.guest_id = target_guest.id
       and invite.event_id = event_row.id
      where event_row.wedding_id = target_wedding.id
    ), '[]'::jsonb),
    'rsvp_responses', coalesce((
      select jsonb_agg(to_jsonb(response_row) order by response_row.updated_at)
      from public.rsvp_responses as response_row
      where response_row.wedding_id = target_wedding.id and response_row.guest_id = target_guest.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_guest_rsvp(wedding_slug text, invite_code text, responses jsonb, meal_preference text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  target_guest public.guests%rowtype;
  response_item jsonb;
  response_event_id uuid;
  response_status text;
  response_attending_count integer;
  response_invited_count integer;
  saved_count integer := 0;
begin
  if jsonb_typeof(coalesce($3, '[]'::jsonb)) <> 'array' then
    raise exception 'Responses must be a JSON array.' using errcode = '22023';
  end if;
  if coalesce($4, '') not in ('', 'veg', 'nonVeg', 'jain') then
    raise exception 'Invalid meal preference.' using errcode = '22023';
  end if;

  select * into target_wedding
  from public.weddings
  where slug = $1 and status = 'published' and payment_status = 'paid';
  if not found then raise exception 'Wedding is unavailable.' using errcode = '42501'; end if;
  if target_wedding.package_type not in ('rsvp', 'whatsapp') then
    raise exception 'RSVP management is not enabled for this wedding.' using errcode = '42501';
  end if;

  select * into target_guest
  from public.guests
  where wedding_id = target_wedding.id and guests.invite_code = $2;
  if not found then raise exception 'Invalid invitation code.' using errcode = '42501'; end if;

  for response_item in select value from jsonb_array_elements(coalesce($3, '[]'::jsonb))
  loop
    begin
      response_event_id := (response_item ->> 'event_id')::uuid;
    exception when others then
      raise exception 'Invalid event ID.' using errcode = '22023';
    end;
    response_status := response_item ->> 'status';
    if response_status is null or response_status not in ('yes', 'no', 'maybe') then
      raise exception 'Invalid RSVP status.' using errcode = '22023';
    end if;
    select coalesce(invite.invited_count, target_guest.invited_count, 1)
    into response_invited_count
    from public.guest_event_invites as invite
    where invite.wedding_id = target_wedding.id
      and invite.guest_id = target_guest.id
      and invite.event_id = response_event_id;

    if response_invited_count is null then
      raise exception 'This invitation does not include one or more submitted events.' using errcode = '42501';
    end if;

    response_attending_count := case
      when response_status = 'yes' then greatest(0, least(coalesce((response_item ->> 'attending_count')::integer, response_invited_count), response_invited_count))
      else 0
    end;

    insert into public.rsvp_responses (wedding_id, guest_id, event_id, status, attending_count)
    values (target_wedding.id, target_guest.id, response_event_id, response_status, response_attending_count)
    on conflict (guest_id, event_id)
    do update set status = excluded.status, attending_count = excluded.attending_count, updated_at = now();
    saved_count := saved_count + 1;
  end loop;

  update public.guests set meal_preference = nullif($4, '')
  where id = target_guest.id and wedding_id = target_wedding.id;
  return jsonb_build_object('success', true, 'saved_count', saved_count);
end;
$$;

create table if not exists public.reveal_variations (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid references public.themes(id) on delete cascade,
  name text not null,
  video_src text,
  poster_src text,
  reveal_image_src text,
  reveal_image_alt text,
  reveal_image_show_at_seconds numeric,
  hero_fade_at_seconds numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.reveal_variations is 'Reveal video/poster/image presets for themes.';

create index if not exists reveal_variations_theme_id_idx on public.reveal_variations(theme_id);
create index if not exists reveal_variations_is_active_idx on public.reveal_variations(is_active);

create table if not exists public.music_options (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  audio_src text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.music_options is 'Selectable music presets.';

create index if not exists music_options_is_active_idx on public.music_options(is_active);

-- Future optional field, intentionally not part of MVP:
-- alter table public.weddings add column deleted_at timestamptz;

-- Scheduling fields, intentionally not part of MVP:
-- alter table public.events add column event_start_at timestamptz;
-- alter table public.events add column event_end_at timestamptz;
-- alter table public.events add column timezone text;

-- Guest draft autosave and atomic dashboard settings/event saves.
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
  event_display_modes jsonb := coalesce(guest_row -> 'invited_event_display_modes', '{}'::jsonb);
  event_ref text;
  invite_count integer;
  invite_display_mode text;
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

  if jsonb_typeof(event_refs) <> 'array'
    or jsonb_typeof(event_counts) <> 'object'
    or jsonb_typeof(event_display_modes) <> 'object'
  then
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

    invite_display_mode := nullif(event_display_modes ->> event_ref, '');
    if invite_display_mode is not null and invite_display_mode not in ('all', 'number') then
      raise exception 'Event invitee display mode must be All or number.' using errcode = '22023';
    end if;

    insert into public.guest_event_invites (
      wedding_id, guest_id, event_id, invited_count, invitee_count_display_mode
    ) values (
      target_wedding_id, resolved_guest_id, event_ref::uuid, invite_count, invite_display_mode
    );
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

create or replace function public.apply_guest_invitee_display_modes(
  target_wedding_id uuid,
  target_guest_id uuid,
  event_display_modes jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  mode_item record;
begin
  if not public.can_manage_wedding(target_wedding_id) then
    raise exception 'Access denied.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.guests
    where id = target_guest_id and wedding_id = target_wedding_id
  ) then
    raise exception 'Guest does not belong to this wedding.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(event_display_modes, '{}'::jsonb)) <> 'object' then
    raise exception 'Event invitee display modes must be a JSON object.' using errcode = '22023';
  end if;

  update public.guest_event_invites
  set invitee_count_display_mode = null
  where wedding_id = target_wedding_id and guest_id = target_guest_id;

  for mode_item in
    select key as event_id, value as display_mode
    from jsonb_each_text(coalesce(event_display_modes, '{}'::jsonb))
  loop
    if mode_item.display_mode not in ('all', 'number') then
      raise exception 'Event invitee display mode must be All or number.' using errcode = '22023';
    end if;

    update public.guest_event_invites
    set invitee_count_display_mode = mode_item.display_mode
    where wedding_id = target_wedding_id
      and guest_id = target_guest_id
      and event_id = mode_item.event_id::uuid;

    if not found then
      raise exception 'Event invitee display mode references an event not assigned to this guest.' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create or replace function public.save_wedding_guest_draft_with_invitee_display_modes(
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
  saved_payload jsonb;
  saved_guest_id uuid;
begin
  saved_payload := public.save_wedding_guest_draft(target_wedding_id, guest_row, expected_updated_at);
  saved_guest_id := (saved_payload #>> '{guest,id}')::uuid;
  perform public.apply_guest_invitee_display_modes(
    target_wedding_id,
    saved_guest_id,
    coalesce(guest_row -> 'invited_event_display_modes', '{}'::jsonb)
  );

  return jsonb_set(
    saved_payload,
    '{guest_event_invites}',
    coalesce((
      select jsonb_agg(to_jsonb(invite) order by invite.created_at)
      from public.guest_event_invites as invite
      where invite.wedding_id = target_wedding_id and invite.guest_id = saved_guest_id
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
revoke all on function public.apply_guest_invitee_display_modes(uuid, uuid, jsonb) from public;
revoke all on function public.save_wedding_guest_draft_with_invitee_display_modes(uuid, jsonb, timestamptz) from public;
revoke all on function public.save_wedding_dashboard_transactional(uuid, jsonb, jsonb, jsonb, timestamptz) from public;
grant execute on function public.save_wedding_guest_draft(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.save_wedding_guest_draft_with_invitee_display_modes(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.save_wedding_dashboard_transactional(uuid, jsonb, jsonb, jsonb, timestamptz) to authenticated;

notify pgrst, 'reload schema';


-- Open Invitations feature
-- Open Invitations
--
-- Run after the current schema, Phase 1 security hardening, Phase 2 data
-- integrity migration, and guest autosave migration. This migration is
-- idempotent and keeps all open-invitation reads/writes behind validated RPCs.

create table if not exists public.open_invitations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 80),
  category text not null default '' check (char_length(btrim(category)) <= 80),
  invite_code text not null default encode(extensions.gen_random_bytes(9), 'hex'),
  is_active boolean not null default true,
  max_party_size integer not null default 20 check (max_party_size between 1 and 20),
  max_total_attendees integer check (max_total_attendees is null or max_total_attendees between 1 and 100000),
  show_invitee_count boolean not null default true,
  meal_preference_enabled boolean not null default true,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, invite_code)
);

alter table public.open_invitations
  add column if not exists show_invitee_count boolean not null default true;

alter table public.open_invitations
  add column if not exists meal_preference_enabled boolean not null default true;

comment on table public.open_invitations is
  'Reusable group invitation links. Respondents become normal guest records after submitting RSVP.';
comment on column public.open_invitations.max_party_size is
  'Maximum self-selected group size for one response. The wedding invitee limit still applies.';
comment on column public.open_invitations.max_total_attendees is
  'Deprecated compatibility field. Open Invitation links no longer enforce a link-wide response or attendee cap.';
comment on column public.open_invitations.show_invitee_count is
  'Whether respondents can choose and see the number of invitees. Hidden-count invitations always register one person per response.';
comment on column public.open_invitations.meal_preference_enabled is
  'Whether this Open Invitation asks respondents with a Yes or Maybe response for meal preference.';

drop trigger if exists open_invitations_set_updated_at on public.open_invitations;
create trigger open_invitations_set_updated_at
before update on public.open_invitations
for each row execute function public.set_updated_at();

create index if not exists open_invitations_wedding_created_idx
  on public.open_invitations (wedding_id, created_at desc);
create index if not exists open_invitations_code_idx
  on public.open_invitations (wedding_id, invite_code);

create table if not exists public.open_invitation_events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  open_invitation_id uuid not null references public.open_invitations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (open_invitation_id, event_id)
);

comment on table public.open_invitation_events is
  'Events visible through one reusable Open Invitation link.';

create index if not exists open_invitation_events_wedding_idx
  on public.open_invitation_events (wedding_id);
create index if not exists open_invitation_events_event_idx
  on public.open_invitation_events (event_id);

create or replace function public.validate_open_invitation_event_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.open_invitations as invitation
    join public.events as event_row
      on event_row.id = new.event_id
    where invitation.id = new.open_invitation_id
      and invitation.wedding_id = new.wedding_id
      and event_row.wedding_id = new.wedding_id
  ) then
    raise exception 'Open invitation and event must belong to the same wedding.' using errcode = '23503';
  end if;

  return new;
end;
$$;

drop trigger if exists open_invitation_events_validate_scope on public.open_invitation_events;
create trigger open_invitation_events_validate_scope
before insert or update of wedding_id, open_invitation_id, event_id
on public.open_invitation_events
for each row execute function public.validate_open_invitation_event_scope();

alter table public.guests
  add column if not exists open_invitation_id uuid references public.open_invitations(id) on delete set null;

create index if not exists guests_open_invitation_idx
  on public.guests (open_invitation_id, created_at desc)
  where open_invitation_id is not null;

comment on column public.guests.open_invitation_id is
  'Shared Open Invitation that created this guest, when applicable.';

alter table public.open_invitations enable row level security;
alter table public.open_invitation_events enable row level security;

-- Management is RPC-only. Public access is also RPC-only so a shared link can
-- never list other links, respondents, guests, or RSVP rows.
revoke all on table public.open_invitations from anon, authenticated;
revoke all on table public.open_invitation_events from anon, authenticated;

create or replace function public.list_open_invitations(target_wedding_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  result jsonb;
begin
  select * into target_wedding
  from public.weddings
  where id = target_wedding_id;

  if not found
    or auth.uid() is null
    or (target_wedding.owner_id is distinct from auth.uid() and not public.is_admin())
  then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', invitation.id,
      'wedding_id', invitation.wedding_id,
      'label', invitation.label,
      'category', invitation.category,
      'invite_code', invitation.invite_code,
      'is_active', invitation.is_active,
      'max_party_size', invitation.max_party_size,
      'show_invitee_count', invitation.show_invitee_count,
      'meal_preference_enabled', invitation.meal_preference_enabled,
      'expires_at', invitation.expires_at,
      'created_at', invitation.created_at,
      'updated_at', invitation.updated_at,
      'event_ids', (
        select coalesce(jsonb_agg(event_row.id order by event_row.sort_order, event_row.created_at), '[]'::jsonb)
        from public.open_invitation_events as assignment
        join public.events as event_row on event_row.id = assignment.event_id
        where assignment.open_invitation_id = invitation.id
      ),
      'response_count', (
        select count(*)::integer
        from public.guests as guest_row
        where guest_row.open_invitation_id = invitation.id
      ),
      'registered_people', (
        select coalesce(sum(guest_row.invited_count), 0)::integer
        from public.guests as guest_row
        where guest_row.open_invitation_id = invitation.id
      )
    ) order by invitation.created_at desc
  ), '[]'::jsonb)
  into result
  from public.open_invitations as invitation
  where invitation.wedding_id = target_wedding_id;

  return result;
end;
$$;

create or replace function public.save_open_invitation(
  target_wedding_id uuid,
  invitation_row jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  saved_invitation public.open_invitations%rowtype;
  invitation_id_text text := btrim(coalesce(invitation_row ->> 'id', ''));
  event_refs jsonb := coalesce(invitation_row -> 'event_ids', '[]'::jsonb);
  requested_id uuid;
  requested_label text := btrim(coalesce(invitation_row ->> 'label', ''));
  requested_category text := btrim(coalesce(invitation_row ->> 'category', ''));
  requested_max_party integer := coalesce(nullif(invitation_row ->> 'max_party_size', '')::integer, 20);
  requested_show_invitee_count boolean := coalesce((invitation_row ->> 'show_invitee_count')::boolean, true);
  requested_meal_preference_enabled boolean := coalesce((invitation_row ->> 'meal_preference_enabled')::boolean, true);
  requested_expires_at timestamptz := nullif(invitation_row ->> 'expires_at', '')::timestamptz;
  requested_active boolean := coalesce((invitation_row ->> 'is_active')::boolean, true);
begin
  select * into target_wedding
  from public.weddings
  where id = target_wedding_id
  for update;

  if not found
    or auth.uid() is null
    or (target_wedding.owner_id is distinct from auth.uid() and not public.is_admin())
  then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;

  if target_wedding.package_type not in ('rsvp', 'whatsapp') and not public.is_admin() then
    raise exception 'Open Invitations require the Pro plan.' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(invitation_row, '{}'::jsonb)) <> 'object' then
    raise exception 'Open invitation data must be an object.' using errcode = '22023';
  end if;
  if requested_label = '' or char_length(requested_label) > 80 then
    raise exception 'Open invitation name must contain between 1 and 80 characters.' using errcode = '22023';
  end if;
  if char_length(requested_category) > 80 then
    raise exception 'Guest category cannot contain more than 80 characters.' using errcode = '22023';
  end if;
  if requested_max_party < 1 or requested_max_party > 20 then
    raise exception 'Maximum group size must be between 1 and 20.' using errcode = '22023';
  end if;
  if jsonb_typeof(event_refs) <> 'array' or jsonb_array_length(event_refs) = 0 then
    raise exception 'Select at least one event for this Open Invitation.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements_text(event_refs) as requested(event_id)
    where not exists (
      select 1 from public.events
      where events.id::text = requested.event_id
        and events.wedding_id = target_wedding_id
    )
  ) then
    raise exception 'One or more selected events do not belong to this wedding.' using errcode = '22023';
  end if;

  if invitation_id_text = '' then
    insert into public.open_invitations (
      wedding_id, label, category, is_active, max_party_size,
      show_invitee_count, meal_preference_enabled, expires_at, created_by
    ) values (
      target_wedding_id, requested_label, requested_category, requested_active,
      requested_max_party, requested_show_invitee_count,
      requested_meal_preference_enabled, requested_expires_at, auth.uid()
    )
    returning * into saved_invitation;
  else
    begin
      requested_id := invitation_id_text::uuid;
    exception when invalid_text_representation then
      raise exception 'Open invitation ID is invalid.' using errcode = '22023';
    end;

    update public.open_invitations
    set label = requested_label,
        category = requested_category,
        is_active = requested_active,
        max_party_size = requested_max_party,
        max_total_attendees = null,
        show_invitee_count = requested_show_invitee_count,
        meal_preference_enabled = requested_meal_preference_enabled,
        expires_at = requested_expires_at
    where id = requested_id
      and wedding_id = target_wedding_id
    returning * into saved_invitation;

    if not found then
      raise exception 'Open invitation not found.' using errcode = 'P0002';
    end if;
  end if;

  delete from public.open_invitation_events
  where open_invitation_id = saved_invitation.id;

  insert into public.open_invitation_events (wedding_id, open_invitation_id, event_id)
  select target_wedding_id, saved_invitation.id, event_row.id
  from public.events as event_row
  join (
    select distinct requested.event_id
    from jsonb_array_elements_text(event_refs) as requested(event_id)
  ) as requested on requested.event_id = event_row.id::text
  where event_row.wedding_id = target_wedding_id;

  return jsonb_build_object(
    'success', true,
    'id', saved_invitation.id,
    'invite_code', saved_invitation.invite_code
  );
end;
$$;

create or replace function public.regenerate_open_invitation_code(
  target_wedding_id uuid,
  target_open_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  next_code text := encode(extensions.gen_random_bytes(9), 'hex');
begin
  select * into target_wedding
  from public.weddings
  where id = target_wedding_id;

  if not found
    or auth.uid() is null
    or (target_wedding.owner_id is distinct from auth.uid() and not public.is_admin())
  then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;

  update public.open_invitations
  set invite_code = next_code
  where id = target_open_invitation_id
    and wedding_id = target_wedding_id;

  if not found then
    raise exception 'Open invitation not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('success', true, 'invite_code', next_code);
end;
$$;

create or replace function public.delete_open_invitation(
  target_wedding_id uuid,
  target_open_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  deleted_count integer;
begin
  select * into target_wedding
  from public.weddings
  where id = target_wedding_id;

  if not found
    or auth.uid() is null
    or (target_wedding.owner_id is distinct from auth.uid() and not public.is_admin())
  then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;

  delete from public.open_invitations
  where id = target_open_invitation_id
    and wedding_id = target_wedding_id;
  get diagnostics deleted_count = row_count;

  if deleted_count = 0 then
    raise exception 'Open invitation not found.' using errcode = 'P0002';
  end if;

  -- Submitted guests remain normal guest records. Their source reference is
  -- cleared by ON DELETE SET NULL and RSVP history remains intact.
  return jsonb_build_object('success', true, 'deleted', deleted_count);
end;
$$;

create or replace function public.get_public_open_invitation_by_code(
  wedding_slug text,
  open_invite_code text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  target_invitation public.open_invitations%rowtype;
  target_settings public.wedding_settings%rowtype;
  event_rows jsonb;
begin
  select wedding.* into target_wedding
  from public.weddings as wedding
  where wedding.slug = btrim(coalesce(wedding_slug, ''))
    and wedding.status = 'published'
    and wedding.payment_status = 'paid'
    and wedding.package_type in ('rsvp', 'whatsapp');

  if not found then
    return null;
  end if;

  select invitation.* into target_invitation
  from public.open_invitations as invitation
  where invitation.wedding_id = target_wedding.id
    and invitation.invite_code = btrim(coalesce(open_invite_code, ''))
    and invitation.is_active
    and (invitation.expires_at is null or invitation.expires_at > now());

  if not found then
    return null;
  end if;

  select * into target_settings
  from public.wedding_settings
  where wedding_id = target_wedding.id;

  select coalesce(jsonb_agg(
    to_jsonb(event_row) || jsonb_build_object(
      'guest_invited_count', case when target_invitation.show_invitee_count then target_invitation.max_party_size else null end,
      'event_show_invited_count', event_row.event_show_invited_count and target_invitation.show_invitee_count
    )
    order by event_row.sort_order, event_row.created_at
  ), '[]'::jsonb)
  into event_rows
  from public.open_invitation_events as assignment
  join public.events as event_row on event_row.id = assignment.event_id
  where assignment.open_invitation_id = target_invitation.id;

  return jsonb_build_object(
    'wedding', to_jsonb(target_wedding) - 'owner_id' - 'created_by',
    'settings', case when target_settings.id is null then null else to_jsonb(target_settings) end,
    'open_invitation', jsonb_build_object(
      'id', target_invitation.id,
      'label', target_invitation.label,
      'category', target_invitation.category,
      'invite_code', target_invitation.invite_code,
      'max_party_size', target_invitation.max_party_size,
      'show_invitee_count', target_invitation.show_invitee_count,
      'meal_preference_enabled', target_invitation.meal_preference_enabled,
      'expires_at', target_invitation.expires_at
    ),
    'events', event_rows
  );
end;
$$;

create or replace function public.submit_open_invitation_rsvp(
  wedding_slug text,
  open_invite_code text,
  respondent_name text,
  respondent_phone text,
  party_size integer,
  responses jsonb,
  meal_preference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  target_invitation public.open_invitations%rowtype;
  existing_guest public.guests%rowtype;
  canonical_phone text;
  clean_name text := btrim(coalesce(respondent_name, ''));
  clean_phone text := btrim(coalesce(respondent_phone, ''));
  clean_meal text := nullif(btrim(coalesce(meal_preference, '')), '');
  allowed_event_count integer;
  response_item jsonb;
  response_event_id uuid;
  response_status text;
  response_attending_count integer;
  saved_guest_id uuid;
  created_invite_code text;
  requires_phone boolean := false;
  existing_guest_found boolean := false;
  submission_action text := 'created';
begin
  select invitation.* into target_invitation
  from public.open_invitations as invitation
  join public.weddings as wedding on wedding.id = invitation.wedding_id
  where wedding.slug = btrim(coalesce(wedding_slug, ''))
    and wedding.status = 'published'
    and wedding.payment_status = 'paid'
    and wedding.package_type in ('rsvp', 'whatsapp')
    and invitation.invite_code = btrim(coalesce(open_invite_code, ''))
    and invitation.is_active
    and (invitation.expires_at is null or invitation.expires_at > now())
  for update of invitation;

  if not found then
    raise exception 'This Open Invitation is invalid, paused, or expired.' using errcode = 'P0002';
  end if;

  select * into target_wedding
  from public.weddings
  where id = target_invitation.wedding_id
  for update;

  if clean_name = '' or char_length(clean_name) > 120 then
    raise exception 'Enter your name using no more than 120 characters.' using errcode = '22023';
  end if;

  if party_size is null or party_size < 1 or party_size > target_invitation.max_party_size then
    raise exception 'Group size must be between 1 and %.', target_invitation.max_party_size using errcode = '22023';
  end if;
  if not target_invitation.show_invitee_count and party_size <> 1 then
    raise exception 'Invitee count is hidden for this Open Invitation; group size must be 1.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(responses, '[]'::jsonb)) <> 'array' then
    raise exception 'RSVP responses must be an array.' using errcode = '22023';
  end if;

  select count(*)::integer into allowed_event_count
  from public.open_invitation_events
  where open_invitation_id = target_invitation.id;

  if allowed_event_count = 0
    or jsonb_array_length(responses) <> allowed_event_count
    or (
      select count(distinct item.value ->> 'event_id')
      from jsonb_array_elements(responses) as item
    ) <> allowed_event_count
  then
    raise exception 'Please answer every event in this invitation.' using errcode = '22023';
  end if;

  for response_item in select value from jsonb_array_elements(responses)
  loop
    begin
      response_event_id := (response_item ->> 'event_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'An RSVP event is invalid.' using errcode = '22023';
    end;
    response_status := btrim(coalesce(response_item ->> 'status', ''));
    response_attending_count := coalesce(nullif(response_item ->> 'attending_count', '')::integer, 0);

    if not exists (
      select 1 from public.open_invitation_events
      where open_invitation_id = target_invitation.id
        and event_id = response_event_id
    ) then
      raise exception 'An RSVP event is not included in this Open Invitation.' using errcode = '22023';
    end if;
    if response_status not in ('yes', 'no', 'maybe') then
      raise exception 'Choose Yes, No, or Maybe for every event.' using errcode = '22023';
    end if;
    if response_status in ('yes', 'maybe') then
      requires_phone := true;
    end if;
    if response_status = 'yes' and (response_attending_count < 1 or response_attending_count > party_size) then
      raise exception 'Attending count must be between 1 and your group size.' using errcode = '22023';
    end if;
    if response_status <> 'yes' and response_attending_count <> 0 then
      raise exception 'Attending count must be zero unless the response is Yes.' using errcode = '22023';
    end if;
  end loop;

  if requires_phone or clean_phone <> '' then
    begin
      canonical_phone := public.normalize_guest_phone_e164(clean_phone);
    exception when others then
      raise exception 'Enter a valid mobile number with its country code.' using errcode = '22023';
    end;
    if canonical_phone is null then
      raise exception 'Enter a valid mobile number with its country code.' using errcode = '22023';
    end if;
  else
    canonical_phone := null;
    clean_phone := '';
  end if;

  if not target_invitation.meal_preference_enabled or not requires_phone then
    clean_meal := null;
  elsif clean_meal is not null and clean_meal not in ('veg', 'nonVeg', 'jain') then
    raise exception 'Meal preference is invalid.' using errcode = '22023';
  end if;

  if canonical_phone is not null then
    select guest.* into existing_guest
    from public.guests as guest
    where guest.wedding_id = target_wedding.id
      and guest.open_invitation_id = target_invitation.id
      and guest.phone = canonical_phone
    order by guest.created_at, guest.id
    limit 1
    for update;

    existing_guest_found := found;

    if not existing_guest_found and exists (
      select 1
      from public.guests as guest
      where guest.wedding_id = target_wedding.id
        and guest.phone = canonical_phone
        and guest.open_invitation_id is distinct from target_invitation.id
    ) then
      raise exception 'This mobile number is already connected to another invitation.' using errcode = '23505';
    end if;
  end if;

  if existing_guest_found then
    saved_guest_id := existing_guest.id;
    submission_action := 'updated';

    update public.guests
    set guest_name = clean_name,
        phone = canonical_phone,
        phone_input = clean_phone,
        invited_count = party_size,
        category = target_invitation.category,
        meal_preference = clean_meal
    where id = saved_guest_id
      and wedding_id = target_wedding.id
      and open_invitation_id = target_invitation.id;
  else
    saved_guest_id := gen_random_uuid();

    loop
      created_invite_code := encode(extensions.gen_random_bytes(9), 'hex');
      exit when not exists (
        select 1 from public.guests
        where wedding_id = target_wedding.id
          and invite_code = created_invite_code
      );
    end loop;

    insert into public.guests (
      id, wedding_id, guest_name, phone, phone_input, invited_count,
      category, invite_code, meal_preference, open_invitation_id
    ) values (
      saved_guest_id, target_wedding.id, clean_name, canonical_phone, clean_phone,
      party_size, target_invitation.category, created_invite_code, clean_meal,
      target_invitation.id
    );
  end if;

  delete from public.guest_event_invites as guest_invite
  where guest_invite.wedding_id = target_wedding.id
    and guest_invite.guest_id = saved_guest_id
    and not exists (
      select 1
      from public.open_invitation_events as assignment
      where assignment.open_invitation_id = target_invitation.id
        and assignment.event_id = guest_invite.event_id
    );

  insert into public.guest_event_invites (wedding_id, guest_id, event_id, invited_count)
  select target_wedding.id, saved_guest_id, assignment.event_id, party_size
  from public.open_invitation_events as assignment
  where assignment.open_invitation_id = target_invitation.id
  on conflict (guest_id, event_id)
  do update set
    wedding_id = excluded.wedding_id,
    invited_count = excluded.invited_count;

  delete from public.rsvp_responses as saved_response
  where saved_response.wedding_id = target_wedding.id
    and saved_response.guest_id = saved_guest_id
    and not exists (
      select 1
      from public.open_invitation_events as assignment
      where assignment.open_invitation_id = target_invitation.id
        and assignment.event_id = saved_response.event_id
    );

  for response_item in select value from jsonb_array_elements(responses)
  loop
    response_event_id := (response_item ->> 'event_id')::uuid;
    response_status := response_item ->> 'status';
    response_attending_count := coalesce(nullif(response_item ->> 'attending_count', '')::integer, 0);

    insert into public.rsvp_responses (
      wedding_id, guest_id, event_id, status, attending_count
    ) values (
      target_wedding.id, saved_guest_id, response_event_id,
      response_status, response_attending_count
    )
    on conflict (guest_id, event_id)
    do update set
      wedding_id = excluded.wedding_id,
      status = excluded.status,
      attending_count = excluded.attending_count,
      updated_at = now();
  end loop;

  return jsonb_build_object(
    'success', true,
    'submission_action', submission_action,
    'guest_id', saved_guest_id,
    'invite_code', case when submission_action = 'created' then created_invite_code else null end,
    'guest_name', clean_name
  );
end;
$$;

comment on function public.submit_open_invitation_rsvp(text, text, text, text, integer, jsonb, text) is
  'Creates an Open Invitation RSVP or updates the response created by the same link and phone without disclosing an existing private invite code.';

revoke all on function public.list_open_invitations(uuid) from public;
revoke all on function public.save_open_invitation(uuid, jsonb) from public;
revoke all on function public.regenerate_open_invitation_code(uuid, uuid) from public;
revoke all on function public.delete_open_invitation(uuid, uuid) from public;
revoke all on function public.get_public_open_invitation_by_code(text, text) from public;
revoke all on function public.submit_open_invitation_rsvp(text, text, text, text, integer, jsonb, text) from public;

grant execute on function public.list_open_invitations(uuid) to authenticated;
grant execute on function public.save_open_invitation(uuid, jsonb) to authenticated;
grant execute on function public.regenerate_open_invitation_code(uuid, uuid) to authenticated;
grant execute on function public.delete_open_invitation(uuid, uuid) to authenticated;
grant execute on function public.get_public_open_invitation_by_code(text, text) to anon, authenticated;
grant execute on function public.submit_open_invitation_rsvp(text, text, text, text, integer, jsonb, text) to anon, authenticated;

notify pgrst, 'reload schema';
