alter table public.wedding_settings
  add column if not exists hero_reveal_style text default 'envelope';

alter table public.wedding_settings
  add column if not exists hero_reveal_image_type text default 'blessing';

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
end $$;
