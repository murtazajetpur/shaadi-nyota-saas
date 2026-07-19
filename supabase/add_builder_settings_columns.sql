-- Consolidated builder settings migration.
-- Run this if dashboard/admin save fails because wedding_settings columns are missing
-- from an older Supabase project schema.

alter table public.wedding_settings
  add column if not exists hero_reveal_style text default 'envelope',
  add column if not exists hero_reveal_cta_text text,
  add column if not exists hero_scroll_hint_text text,
  add column if not exists hero_video_src text,
  add column if not exists hero_poster_src text,
  add column if not exists hero_skip_reveal_image boolean not null default false,
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
  add column if not exists rsvp_attending_count_enabled boolean not null default true,
  add column if not exists rsvp_background_image_src text,
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
  add column if not exists closing_frame_image_src text,
  add column if not exists closing_background_image_src text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'wedding_settings_hero_reveal_style_check'
  ) then
    alter table public.wedding_settings
      add constraint wedding_settings_hero_reveal_style_check
      check (hero_reveal_style in ('envelope', 'scroll', 'palace-door'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'wedding_settings_hero_reveal_image_type_check'
  ) then
    alter table public.wedding_settings
      add constraint wedding_settings_hero_reveal_image_type_check
      check (hero_reveal_image_type in ('blessing', 'couple', 'floral'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'wedding_settings_closing_layout_check'
  ) then
    alter table public.wedding_settings
      add constraint wedding_settings_closing_layout_check
      check (closing_layout in ('simple', 'gallery'));
  end if;
end $$;

drop policy if exists "Admins can manage all wedding settings" on public.wedding_settings;
create policy "Admins can manage all wedding settings"
on public.wedding_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

