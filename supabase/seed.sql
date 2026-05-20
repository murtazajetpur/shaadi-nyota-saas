-- Minimal seed data for Shaadi Nyota MVP setup.
-- Run this after schema.sql and rls_policies.sql.

insert into public.themes (theme_key, display_name, description, is_active)
values
  (
    'palace-door-opening',
    'Palace Door Opening',
    'Current Shaadi Nyota invite theme with reveal video and wedding sections.',
    true
  ),
  (
    'theme-2',
    'Scroll Opening Invite',
    'A cinematic scroll-style wedding invitation adapted from the second reference demo.',
    true
  )
on conflict (theme_key) do update
set
  display_name = excluded.display_name,
  description = excluded.description,
  is_active = excluded.is_active;

insert into public.reveal_variations (
  theme_id,
  name,
  video_src,
  poster_src,
  reveal_image_src,
  reveal_image_alt,
  reveal_image_show_at_seconds,
  hero_fade_at_seconds,
  is_active
)
select
  themes.id,
  'Default Ganesha Reveal',
  '/assets/hero-v1.mp4',
  '/assets/hero-poster-v1.jpeg',
  '/assets/Ganesha Image.png',
  'Lord Ganesha',
  5.0,
  7.95,
  true
from public.themes
where themes.theme_key = 'palace-door-opening'
and not exists (
  select 1
  from public.reveal_variations
  where reveal_variations.name = 'Default Ganesha Reveal'
    and reveal_variations.theme_id = themes.id
);

insert into public.music_options (title, audio_src, is_active)
select
  'Din Shagna Da',
  '/assets/din-shangda-audio.mp3',
  true
where not exists (
  select 1
  from public.music_options
  where title = 'Din Shagna Da'
    and audio_src = '/assets/din-shangda-audio.mp3'
);
