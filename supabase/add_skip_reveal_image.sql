-- Add an Opening Reveal setting that lets a wedding skip the post-video reveal image.
-- Run this in Supabase SQL Editor, then refresh/retry the dashboard save if PostgREST schema cache has not refreshed yet.

alter table public.wedding_settings
  add column if not exists hero_skip_reveal_image boolean;

update public.wedding_settings
set hero_skip_reveal_image = false
where hero_skip_reveal_image is null;

alter table public.wedding_settings
  alter column hero_skip_reveal_image set default false,
  alter column hero_skip_reveal_image set not null;

notify pgrst, 'reload schema';