alter table public.wedding_settings
  add column if not exists closing_layout text not null default 'gallery',
  add column if not exists closing_include_photos boolean not null default false,
  add column if not exists closing_line text,
  add column if not exists closing_couple_display_name text,
  add column if not exists closing_message text,
  add column if not exists closing_carousel_images jsonb,
  add column if not exists closing_gallery_images jsonb,
  add column if not exists closing_frame_image_src text;

do $$
begin
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
