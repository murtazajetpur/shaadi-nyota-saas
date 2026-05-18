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
create policy "Public can read published weddings"
on public.weddings
for select
to anon, authenticated
using (status = 'published');

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

drop policy if exists "Public can read published wedding settings" on public.wedding_settings;
create policy "Public can read published wedding settings"
on public.wedding_settings
for select
to anon, authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = wedding_settings.wedding_id
      and weddings.status = 'published'
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
create policy "Public can read published events"
on public.events
for select
to anon, authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = events.wedding_id
      and weddings.status = 'published'
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

drop policy if exists "Public can read published invite guests" on public.guests;
create policy "Public can read published invite guests"
on public.guests
for select
to anon, authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = guests.wedding_id
      and weddings.status = 'published'
  )
);

drop policy if exists "Public can update published guest meal preference" on public.guests;
create policy "Public can update published guest meal preference"
on public.guests
for update
to anon, authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = guests.wedding_id
      and weddings.status = 'published'
  )
)
with check (
  exists (
    select 1 from public.weddings
    where weddings.id = guests.wedding_id
      and weddings.status = 'published'
  )
);

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

drop policy if exists "Public can read published guest event invites" on public.guest_event_invites;
create policy "Public can read published guest event invites"
on public.guest_event_invites
for select
to anon, authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = guest_event_invites.wedding_id
      and weddings.status = 'published'
  )
);

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

drop policy if exists "Public can read published valid RSVP responses" on public.rsvp_responses;
create policy "Public can read published valid RSVP responses"
on public.rsvp_responses
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.weddings
    join public.guest_event_invites
      on guest_event_invites.wedding_id = weddings.id
     and guest_event_invites.guest_id = rsvp_responses.guest_id
     and guest_event_invites.event_id = rsvp_responses.event_id
    where weddings.id = rsvp_responses.wedding_id
      and weddings.status = 'published'
  )
);

drop policy if exists "Public can insert published valid RSVP responses" on public.rsvp_responses;
create policy "Public can insert published valid RSVP responses"
on public.rsvp_responses
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.weddings
    join public.guest_event_invites
      on guest_event_invites.wedding_id = weddings.id
     and guest_event_invites.guest_id = rsvp_responses.guest_id
     and guest_event_invites.event_id = rsvp_responses.event_id
    where weddings.id = rsvp_responses.wedding_id
      and weddings.status = 'published'
  )
);

drop policy if exists "Public can update published valid RSVP responses" on public.rsvp_responses;
create policy "Public can update published valid RSVP responses"
on public.rsvp_responses
for update
to anon, authenticated
using (
  exists (
    select 1
    from public.weddings
    join public.guest_event_invites
      on guest_event_invites.wedding_id = weddings.id
     and guest_event_invites.guest_id = rsvp_responses.guest_id
     and guest_event_invites.event_id = rsvp_responses.event_id
    where weddings.id = rsvp_responses.wedding_id
      and weddings.status = 'published'
  )
)
with check (
  exists (
    select 1
    from public.weddings
    join public.guest_event_invites
      on guest_event_invites.wedding_id = weddings.id
     and guest_event_invites.guest_id = rsvp_responses.guest_id
     and guest_event_invites.event_id = rsvp_responses.event_id
    where weddings.id = rsvp_responses.wedding_id
      and weddings.status = 'published'
  )
);

