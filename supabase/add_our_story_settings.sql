alter table public.wedding_settings
  add column if not exists story_title text,
  add column if not exists story_text text,
  add column if not exists story_image_src text,
  add column if not exists story_image_alt text;

