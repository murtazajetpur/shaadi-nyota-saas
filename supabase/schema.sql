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
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.weddings is 'Main wedding record and route identity.';
comment on column public.weddings.owner_id is 'Couple/user who owns the wedding.';
comment on column public.weddings.created_by is 'User/admin who created the wedding record.';
comment on column public.weddings.package_type is 'Internal values include active basic/rsvp plans plus a legacy compatibility value. Active purchasable plans are basic and rsvp.';
comment on column public.weddings.payment_status is 'Manual payment workflow values: unpaid, manual_pending, ref_pending, paid.';
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
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.package_type is distinct from old.package_type
    or new.status is distinct from old.status
    or new.published_at is distinct from old.published_at
    or new.owner_id is distinct from old.owner_id
    or new.created_by is distinct from old.created_by
  then
    raise exception 'Only an admin can change wedding plan, publication, or ownership fields.'
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
  invited_count integer not null default 1 check (invited_count >= 1),
  category text,
  invite_code text not null,
  meal_preference text check (meal_preference in ('veg', 'nonVeg', 'jain')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, invite_code)
);

comment on table public.guests is 'Guest/family records and personalized invite codes.';
comment on column public.guests.meal_preference is 'Stored once per guest/family, not per event.';

create trigger guests_set_updated_at
before update on public.guests
for each row execute function public.set_updated_at();

create index if not exists guests_wedding_id_idx on public.guests(wedding_id);
create index if not exists guests_phone_idx on public.guests(phone);
create index if not exists guests_category_idx on public.guests(category);

create table if not exists public.guest_event_invites (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  invited_count integer not null default 1 check (invited_count >= 1),
  created_at timestamptz not null default now(),
  unique (guest_id, event_id)
);

comment on table public.guest_event_invites is 'Join table for guest-wise event visibility.';

create index if not exists guest_event_invites_wedding_id_idx on public.guest_event_invites(wedding_id);
create index if not exists guest_event_invites_event_id_idx on public.guest_event_invites(event_id);

create table if not exists public.rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null check (status in ('yes', 'no', 'maybe')),
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
      select jsonb_agg((to_jsonb(event_row) || jsonb_build_object('guest_invited_count', coalesce(invite.invited_count, target_guest.invited_count, 1))) order by event_row.sort_order)
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
    if not exists (
      select 1 from public.guest_event_invites as invite
      where invite.wedding_id = target_wedding.id
        and invite.guest_id = target_guest.id
        and invite.event_id = response_event_id
    ) then
      raise exception 'This invitation does not include one or more submitted events.' using errcode = '42501';
    end if;

    insert into public.rsvp_responses (wedding_id, guest_id, event_id, status)
    values (target_wedding.id, target_guest.id, response_event_id, response_status)
    on conflict (guest_id, event_id)
    do update set status = excluded.status, updated_at = now();
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
