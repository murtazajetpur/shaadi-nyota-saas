-- Targeted fix for admin/couple event editing.
-- Run this if Dashboard/Admin event saves fail with an RLS or permission error.

alter table public.events enable row level security;

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

-- Earlier development migrations may have added a restrictive animation-key
-- check constraint before the current colored petal options existed. The app
-- normalizes allowed values in code, so remove stale DB-level animation checks.
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
end $$;

grant select on public.weddings to authenticated;
grant select, insert, update, delete on public.events to authenticated;

drop policy if exists "Couples can manage own events" on public.events;
create policy "Couples can manage own events"
on public.events
for all
to authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = events.wedding_id
      and weddings.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.weddings
    where weddings.id = events.wedding_id
      and weddings.owner_id = auth.uid()
  )
);

drop policy if exists "Admins can manage all events" on public.events;
create policy "Admins can manage all events"
on public.events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
