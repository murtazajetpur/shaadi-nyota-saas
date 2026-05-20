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
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
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
comment on column public.weddings.package_type is 'Internal values: basic, rsvp, whatsapp. UI labels are Nyota Classic, Nyota Plus, Nyota Complete.';
comment on column public.weddings.payment_status is 'MVP values only: unpaid, paid. Manual/refund statuses can be added later.';
comment on column public.weddings.published_at is 'Set when status first changes to published.';

create trigger weddings_set_updated_at
before update on public.weddings
for each row execute function public.set_updated_at();

create index if not exists weddings_owner_id_idx on public.weddings(owner_id);
create index if not exists weddings_created_by_idx on public.weddings(created_by);
create index if not exists weddings_status_idx on public.weddings(status);
create index if not exists weddings_payment_status_idx on public.weddings(payment_status);
create index if not exists weddings_package_type_idx on public.weddings(package_type);

create table if not exists public.wedding_settings (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null unique references public.weddings(id) on delete cascade,
  hero_reveal_cta_text text,
  hero_scroll_hint_text text,
  hero_video_src text,
  hero_poster_src text,
  hero_reveal_image_src text,
  hero_reveal_image_alt text,
  hero_reveal_image_show_at_seconds numeric,
  hero_fade_at_seconds numeric,
  music_audio_src text,
  music_title text,
  couple_enabled boolean not null default true,
  couple_intro_line text,
  couple_blessing_line text,
  couple_background_image_src text,
  rsvp_enabled boolean not null default true,
  rsvp_title text,
  rsvp_subtitle text,
  rsvp_labels jsonb,
  rsvp_meal_preference_enabled boolean not null default true,
  rsvp_meal_options jsonb,
  rsvp_success_message jsonb,
  closing_line text,
  closing_couple_display_name text,
  closing_carousel_images jsonb,
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
comment on column public.events.date_label is 'MVP display label. Add event_start_at before reminder automation.';
comment on column public.events.start_time_label is 'MVP display label. Add timezone-aware datetime fields before WhatsApp reminders.';

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

-- Future reminder fields, intentionally not part of MVP:
-- alter table public.events add column event_start_at timestamptz;
-- alter table public.events add column event_end_at timestamptz;
-- alter table public.events add column timezone text;
