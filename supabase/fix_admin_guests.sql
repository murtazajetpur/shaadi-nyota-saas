-- Targeted fix for admin/couple guest editing.
-- Run this if Dashboard/Admin guest saves fail with an RLS or permission error.

alter table public.guests enable row level security;

grant select on public.weddings to authenticated;
grant select, insert, update, delete on public.guests to authenticated;
grant select, insert, update, delete on public.guest_event_invites to authenticated;

drop policy if exists "Couples can manage own guests" on public.guests;
create policy "Couples can manage own guests"
on public.guests
for all
to authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = guests.wedding_id
      and weddings.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.weddings
    where weddings.id = guests.wedding_id
      and weddings.owner_id = auth.uid()
  )
);

drop policy if exists "Admins can manage all guests" on public.guests;
create policy "Admins can manage all guests"
on public.guests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
