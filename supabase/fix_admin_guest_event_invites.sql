-- Targeted fix for admin/couple guest event invite editing.
-- Run this if Dashboard/Admin guest event toggles fail with an RLS or permission error.

alter table public.guest_event_invites enable row level security;

grant select, insert, update, delete on public.guest_event_invites to authenticated;

drop policy if exists "Couples can manage own guest event invites" on public.guest_event_invites;
create policy "Couples can manage own guest event invites"
on public.guest_event_invites
for all
to authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = guest_event_invites.wedding_id
      and weddings.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.weddings
    where weddings.id = guest_event_invites.wedding_id
      and weddings.owner_id = auth.uid()
  )
);

drop policy if exists "Admins can manage all guest event invites" on public.guest_event_invites;
create policy "Admins can manage all guest event invites"
on public.guest_event_invites
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
