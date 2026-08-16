-- Shaadi Nyota MVP Row Level Security policies.
-- Run after schema.sql and before seed.sql.

alter table public.profiles enable row level security;
alter table public.themes enable row level security;
alter table public.reveal_variations enable row level security;
alter table public.music_options enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_settings enable row level security;
alter table public.wedding_media enable row level security;
alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.guest_event_invites enable row level security;
alter table public.guest_message_history enable row level security;
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

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role
    and not public.is_admin()
    and coalesce(auth.role(), '') <> 'service_role'
    and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Only an administrator can change profile roles.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_role() from public;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
before update of role on public.profiles
for each row execute function public.protect_profile_role();

revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

revoke all privileges on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone) on table public.profiles to authenticated;

revoke all privileges on table public.themes from public, anon, authenticated;
revoke all privileges on table public.reveal_variations from public, anon, authenticated;
revoke all privileges on table public.music_options from public, anon, authenticated;
grant select on table public.themes to anon, authenticated;
grant select on table public.reveal_variations to anon, authenticated;
grant select on table public.music_options to anon, authenticated;

revoke all privileges on table public.weddings from public, anon, authenticated;
grant select on table public.weddings to anon;
grant select, insert, update on table public.weddings to authenticated;

revoke all privileges on table public.wedding_settings from public, anon, authenticated;
grant select on table public.wedding_settings to anon;
grant select, insert, update, delete on table public.wedding_settings to authenticated;

revoke all privileges on table public.events from public, anon, authenticated;
grant select on table public.events to anon;
grant select, insert, update, delete on table public.events to authenticated;

revoke all privileges on table public.guests from public, anon, authenticated;
grant select, insert, update, delete on table public.guests to authenticated;

revoke all privileges on table public.guest_event_invites from public, anon, authenticated;
grant select, insert, update, delete on table public.guest_event_invites to authenticated;

revoke all privileges on table public.guest_message_history from public, anon, authenticated;
grant select, insert, delete on table public.guest_message_history to authenticated;

revoke all privileges on table public.rsvp_responses from public, anon, authenticated;
grant select, insert, update on table public.rsvp_responses to authenticated;

revoke all privileges on table public.wedding_media from public, anon, authenticated;
grant select, insert, delete on table public.wedding_media to authenticated;

drop policy if exists "Public can read active themes" on public.themes;
create policy "Public can read active themes"
on public.themes for select to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read active reveal variations" on public.reveal_variations;
create policy "Public can read active reveal variations"
on public.reveal_variations for select to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.themes
    where themes.id = reveal_variations.theme_id
      and themes.is_active = true
  )
);

drop policy if exists "Public can read active music options" on public.music_options;
create policy "Public can read active music options"
on public.music_options for select to anon, authenticated
using (is_active = true);
drop policy if exists "Users can read own profile or admins can read all" on public.profiles;
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

drop policy if exists "Couples and admins can read wedding media" on public.wedding_media;
create policy "Couples and admins can read wedding media"
on public.wedding_media
for select
to authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = wedding_media.wedding_id
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Couples and admins can add wedding media" on public.wedding_media;
create policy "Couples and admins can add wedding media"
on public.wedding_media
for insert
to authenticated
with check (
  exists (
    select 1 from public.weddings
    where weddings.id = wedding_media.wedding_id
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Couples and admins can delete wedding media" on public.wedding_media;
create policy "Couples and admins can delete wedding media"
on public.wedding_media
for delete
to authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = wedding_media.wedding_id
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Couples can read own events" on public.events;
drop policy if exists "Couples can insert own events" on public.events;
drop policy if exists "Couples can update own events" on public.events;
drop policy if exists "Couples can delete own events" on public.events;
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

drop policy if exists "Admins can read all events" on public.events;
drop policy if exists "Admins can insert all events" on public.events;
drop policy if exists "Admins can update all events" on public.events;
drop policy if exists "Admins can delete all events" on public.events;
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

drop policy if exists "Couples can read own guests" on public.guests;
drop policy if exists "Couples can insert own guests" on public.guests;
drop policy if exists "Couples can update own guests" on public.guests;
drop policy if exists "Couples can delete own guests" on public.guests;
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

drop policy if exists "Admins can read all guests" on public.guests;
drop policy if exists "Admins can insert all guests" on public.guests;
drop policy if exists "Admins can update all guests" on public.guests;
drop policy if exists "Admins can delete all guests" on public.guests;
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
drop policy if exists "Public invite can read guests" on public.guests;
drop policy if exists "Public invite can update guest meal preference" on public.guests;

drop policy if exists "Couples can read own guest event invites" on public.guest_event_invites;
drop policy if exists "Couples can insert own guest event invites" on public.guest_event_invites;
drop policy if exists "Couples can update own guest event invites" on public.guest_event_invites;
drop policy if exists "Couples can delete own guest event invites" on public.guest_event_invites;
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

drop policy if exists "Admins can read all guest event invites" on public.guest_event_invites;
drop policy if exists "Admins can insert all guest event invites" on public.guest_event_invites;
drop policy if exists "Admins can update all guest event invites" on public.guest_event_invites;
drop policy if exists "Admins can delete all guest event invites" on public.guest_event_invites;
drop policy if exists "Admins can manage all guest event invites" on public.guest_event_invites;
create policy "Admins can manage all guest event invites"
on public.guest_event_invites
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Couples can manage own guest message history" on public.guest_message_history;
create policy "Couples can manage own guest message history"
on public.guest_message_history
for all
to authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = guest_message_history.wedding_id
      and weddings.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.weddings
    where weddings.id = guest_message_history.wedding_id
      and weddings.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.guests
    where guests.id = guest_message_history.guest_id
      and guests.wedding_id = guest_message_history.wedding_id
  )
);

drop policy if exists "Admins can manage all guest message history" on public.guest_message_history;
create policy "Admins can manage all guest message history"
on public.guest_message_history
for all
to authenticated
using (public.is_admin())
with check (
  public.is_admin()
  and exists (
    select 1 from public.guests
    where guests.id = guest_message_history.guest_id
      and guests.wedding_id = guest_message_history.wedding_id
  )
);

-- Public guest-event assignments are returned only by get_public_invite_by_code.
drop policy if exists "Public can read published guest event invites" on public.guest_event_invites;
drop policy if exists "Public invite can read guest event invites" on public.guest_event_invites;

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
drop policy if exists "Public invite can read RSVP responses" on public.rsvp_responses;
drop policy if exists "Public invite can insert RSVP responses" on public.rsvp_responses;
drop policy if exists "Public invite can update RSVP responses" on public.rsvp_responses;

revoke all privileges on public.guests from anon;
revoke all privileges on public.guest_message_history from anon;
revoke all privileges on public.guest_event_invites from anon;
revoke all privileges on public.rsvp_responses from anon;

revoke all on function public.get_public_wedding_route_status(text) from public;
revoke all on function public.get_public_invite_by_code(text, text) from public;
revoke all on function public.submit_guest_rsvp(text, text, jsonb, text) from public;
revoke all on function public.request_payment_verification(uuid) from public;
grant execute on function public.get_public_wedding_route_status(text) to anon, authenticated;
grant execute on function public.get_public_invite_by_code(text, text) to anon, authenticated;
grant execute on function public.submit_guest_rsvp(text, text, jsonb, text) to anon, authenticated;
grant execute on function public.request_payment_verification(uuid) to authenticated;
