-- Shaadi Nyota MVP Row Level Security policies.
-- Run after schema.sql and before seed.sql.

alter table public.profiles enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_settings enable row level security;
alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.guest_event_invites enable row level security;
alter table public.rsvp_responses enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.weddings to authenticated;
grant select, insert, update on public.weddings to authenticated;
grant select, insert, update, delete on public.wedding_settings to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.guests to authenticated;
grant select, insert, update, delete on public.guest_event_invites to authenticated;
grant select, insert, update on public.rsvp_responses to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "Couples can create own weddings" on public.weddings;
create policy "Couples can create own weddings"
on public.weddings
for insert
to authenticated
with check (owner_id = auth.uid() and created_by = auth.uid());

drop policy if exists "Couples can read own weddings" on public.weddings;
create policy "Couples can read own weddings"
on public.weddings
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Couples can update own weddings" on public.weddings;
create policy "Couples can update own weddings"
on public.weddings
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Admins can read all weddings" on public.weddings;
create policy "Admins can read all weddings"
on public.weddings
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update all weddings" on public.weddings;
create policy "Admins can update all weddings"
on public.weddings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read published weddings" on public.weddings;
drop policy if exists "Public can read paid published weddings" on public.weddings;
create policy "Public can read paid published weddings"
on public.weddings
for select
to anon, authenticated
using (status = 'published' and payment_status = 'paid');

drop policy if exists "Couples can create own wedding settings" on public.wedding_settings;
create policy "Couples can create own wedding settings"
on public.wedding_settings
for insert
to authenticated
with check (
  exists (
    select 1 from public.weddings
    where weddings.id = wedding_settings.wedding_id
      and weddings.owner_id = auth.uid()
  )
);

drop policy if exists "Couples can read own wedding settings" on public.wedding_settings;
create policy "Couples can read own wedding settings"
on public.wedding_settings
for select
to authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = wedding_settings.wedding_id
      and weddings.owner_id = auth.uid()
  )
);

drop policy if exists "Couples can update own wedding settings" on public.wedding_settings;
create policy "Couples can update own wedding settings"
on public.wedding_settings
for update
to authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = wedding_settings.wedding_id
      and weddings.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.weddings
    where weddings.id = wedding_settings.wedding_id
      and weddings.owner_id = auth.uid()
  )
);

drop policy if exists "Admins can read all wedding settings" on public.wedding_settings;
create policy "Admins can read all wedding settings"
on public.wedding_settings
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage all wedding settings" on public.wedding_settings;
create policy "Admins can manage all wedding settings"
on public.wedding_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read published wedding settings" on public.wedding_settings;
drop policy if exists "Public can read paid published wedding settings" on public.wedding_settings;
create policy "Public can read paid published wedding settings"
on public.wedding_settings
for select
to anon, authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = wedding_settings.wedding_id
      and weddings.status = 'published'
      and weddings.payment_status = 'paid'
  )
);

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

drop policy if exists "Public can read published events" on public.events;
drop policy if exists "Public can read paid published events" on public.events;
create policy "Public can read paid published events"
on public.events
for select
to anon, authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = events.wedding_id
      and weddings.status = 'published'
      and weddings.payment_status = 'paid'
  )
);

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

-- Public guest lookup and meal preference updates go through secure RPCs.
drop policy if exists "Public can read published invite guests" on public.guests;
drop policy if exists "Public can update published guest meal preference" on public.guests;

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

-- Public guest-event assignments are returned only by get_public_invite_by_code.
drop policy if exists "Public can read published guest event invites" on public.guest_event_invites;

drop policy if exists "Couples can read own RSVP responses" on public.rsvp_responses;
create policy "Couples can read own RSVP responses"
on public.rsvp_responses
for select
to authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = rsvp_responses.wedding_id
      and weddings.owner_id = auth.uid()
  )
);

drop policy if exists "Admins can read all RSVP responses" on public.rsvp_responses;
create policy "Admins can read all RSVP responses"
on public.rsvp_responses
for select
to authenticated
using (public.is_admin());

-- Public RSVP reads/writes go through secure invite-code validated RPCs.
drop policy if exists "Public can read published valid RSVP responses" on public.rsvp_responses;
drop policy if exists "Public can insert published valid RSVP responses" on public.rsvp_responses;
drop policy if exists "Public can update published valid RSVP responses" on public.rsvp_responses;

revoke all privileges on public.guests from anon;
revoke all privileges on public.guest_event_invites from anon;
revoke all privileges on public.rsvp_responses from anon;

revoke all on function public.get_public_invite_by_code(text, text) from public;
revoke all on function public.submit_guest_rsvp(text, text, jsonb, text) from public;
revoke all on function public.request_payment_verification(uuid) from public;
grant execute on function public.get_public_invite_by_code(text, text) to anon, authenticated;
grant execute on function public.submit_guest_rsvp(text, text, jsonb, text) to anon, authenticated;
grant execute on function public.request_payment_verification(uuid) to authenticated;
