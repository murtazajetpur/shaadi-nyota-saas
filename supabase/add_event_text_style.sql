-- Add event text readability controls for existing Supabase projects.
alter table public.events
add column if not exists event_text_style text default 'auto';

update public.events
set event_text_style = 'auto'
where event_text_style is null
   or event_text_style not in ('auto', 'light', 'dark');

alter table public.events
alter column event_text_style set default 'auto';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_event_text_style_check'
  ) then
    alter table public.events
    add constraint events_event_text_style_check
    check (event_text_style in ('auto', 'light', 'dark'));
  end if;
end $$;
