-- Consolidated repair for dashboard/admin editing.
-- Run this on an existing Supabase project if any dashboard/admin section save
-- fails with an RLS, permission, schema-cache, or stale constraint error.

alter table public.profiles enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_settings enable row level security;
alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.guest_event_invites enable row level security;
alter table public.rsvp_responses enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

alter table public.weddings drop constraint if exists weddings_payment_status_check;
alter table public.weddings
  add constraint weddings_payment_status_check
  check (payment_status in ('unpaid', 'manual_pending', 'ref_pending', 'paid'));

alter table public.wedding_settings
  add column if not exists hero_reveal_style text default 'envelope',
  add column if not exists hero_reveal_cta_text text,
  add column if not exists hero_scroll_hint_text text,
  add column if not exists hero_video_src text,
  add column if not exists hero_poster_src text,
  add column if not exists hero_reveal_image_src text,
  add column if not exists hero_reveal_image_type text default 'blessing',
  add column if not exists hero_reveal_image_alt text,
  add column if not exists hero_reveal_image_show_at_seconds numeric,
  add column if not exists hero_fade_at_seconds numeric,
  add column if not exists music_audio_src text,
  add column if not exists music_title text,
  add column if not exists couple_enabled boolean not null default true,
  add column if not exists couple_intro_line text,
  add column if not exists couple_blessing_line text,
  add column if not exists couple_background_image_src text,
  add column if not exists story_title text,
  add column if not exists story_text text,
  add column if not exists story_image_src text,
  add column if not exists story_image_alt text,
  add column if not exists rsvp_enabled boolean not null default true,
  add column if not exists rsvp_title text,
  add column if not exists rsvp_subtitle text,
  add column if not exists rsvp_labels jsonb,
  add column if not exists rsvp_meal_preference_enabled boolean not null default true,
  add column if not exists rsvp_meal_options jsonb,
  add column if not exists rsvp_success_message jsonb,
  add column if not exists closing_enabled boolean not null default true,
  add column if not exists closing_layout text not null default 'gallery',
  add column if not exists closing_include_photos boolean not null default false,
  add column if not exists closing_line text,
  add column if not exists closing_couple_display_name text,
  add column if not exists closing_message text,
  add column if not exists closing_carousel_images jsonb,
  add column if not exists closing_gallery_images jsonb,
  add column if not exists closing_frame_image_src text;

alter table public.events
  add column if not exists event_key text,
  add column if not exists event_visual_key text,
  add column if not exists event_text_style text not null default 'auto',
  add column if not exists event_animation_key text not null default 'none';

update public.events
set event_text_style = 'auto'
where event_text_style is null
   or event_text_style not in ('auto', 'light', 'dark');

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%event_animation_key%'
  loop
    execute format('alter table public.events drop constraint if exists %I', constraint_record.conname);
  end loop;

  if not exists (
    select 1 from pg_constraint where conname = 'events_event_text_style_check'
  ) then
    alter table public.events
      add constraint events_event_text_style_check
      check (event_text_style in ('auto', 'light', 'dark'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'wedding_settings_hero_reveal_style_check'
  ) then
    alter table public.wedding_settings
      add constraint wedding_settings_hero_reveal_style_check
      check (hero_reveal_style in ('envelope', 'scroll', 'palace-door'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'wedding_settings_hero_reveal_image_type_check'
  ) then
    alter table public.wedding_settings
      add constraint wedding_settings_hero_reveal_image_type_check
      check (hero_reveal_image_type in ('blessing', 'couple', 'floral'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'wedding_settings_closing_layout_check'
  ) then
    alter table public.wedding_settings
      add constraint wedding_settings_closing_layout_check
      check (closing_layout in ('simple', 'gallery'));
  end if;
end $$;

grant select on public.profiles to authenticated;
grant select, insert, update on public.weddings to authenticated;
grant select, insert, update, delete on public.wedding_settings to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.guests to authenticated;
grant select, insert, update, delete on public.guest_event_invites to authenticated;
grant select, insert, update on public.rsvp_responses to authenticated;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read all weddings" on public.weddings;
create policy "Admins can read all weddings"
on public.weddings
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update all weddings" on public.weddings;
create policy "Admins can update all weddings"
on public.weddings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage all wedding settings" on public.wedding_settings;
create policy "Admins can manage all wedding settings"
on public.wedding_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage all events" on public.events;
create policy "Admins can manage all events"
on public.events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage all guests" on public.guests;
create policy "Admins can manage all guests"
on public.guests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage all guest event invites" on public.guest_event_invites;
create policy "Admins can manage all guest event invites"
on public.guest_event_invites
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read all RSVP responses" on public.rsvp_responses;
create policy "Admins can read all RSVP responses"
on public.rsvp_responses
for select
to authenticated
using (public.is_admin());
