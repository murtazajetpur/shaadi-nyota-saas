-- Public invite access repair script.
-- Run this in Supabase SQL Editor if published invite links do not work in
-- incognito or for logged-out guests.
--
-- This keeps private write/admin behavior behind existing authenticated RLS
-- policies, but explicitly allows anon/authenticated clients to read only
-- published wedding website data needed by public invite routes.

alter table public.weddings enable row level security;
alter table public.wedding_settings enable row level security;
alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.guest_event_invites enable row level security;
alter table public.rsvp_responses enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.weddings to anon, authenticated;
grant select on public.wedding_settings to anon, authenticated;
grant select on public.events to anon, authenticated;
grant select on public.guests to anon, authenticated;
grant select on public.guest_event_invites to anon, authenticated;
grant select, insert, update on public.rsvp_responses to anon, authenticated;
grant update (meal_preference) on public.guests to anon, authenticated;

drop policy if exists "Public can read published weddings" on public.weddings;
create policy "Public can read published weddings"
on public.weddings
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Public can read published wedding settings" on public.wedding_settings;
create policy "Public can read published wedding settings"
on public.wedding_settings
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.weddings
    where weddings.id = wedding_settings.wedding_id
      and weddings.status = 'published'
  )
);

drop policy if exists "Public can read published events" on public.events;
create policy "Public can read published events"
on public.events
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.weddings
    where weddings.id = events.wedding_id
      and weddings.status = 'published'
  )
);

drop policy if exists "Public can read published invite guests" on public.guests;
create policy "Public can read published invite guests"
on public.guests
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.weddings
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
    select 1
    from public.weddings
    where weddings.id = guests.wedding_id
      and weddings.status = 'published'
  )
)
with check (
  exists (
    select 1
    from public.weddings
    where weddings.id = guests.wedding_id
      and weddings.status = 'published'
  )
);

drop policy if exists "Public can read published guest event invites" on public.guest_event_invites;
create policy "Public can read published guest event invites"
on public.guest_event_invites
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.weddings
    where weddings.id = guest_event_invites.wedding_id
      and weddings.status = 'published'
  )
);

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

