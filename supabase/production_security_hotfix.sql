-- Shaadi Nyota production security hotfix.
--
-- Run this once in the Supabase SQL Editor after the current schema, RLS,
-- Phase 1 security, Phase 2 data-integrity, and wedding-media migrations.
-- The migration is idempotent and keeps public invite rendering on the existing
-- paid/published policies while moving personalized guest access to RPCs only.

begin;

do $$
begin
  if to_regprocedure('public.get_public_invite_by_code(text,text)') is null then
    raise exception 'Missing public.get_public_invite_by_code(text,text). Apply security_hardening_phase_1.sql first.';
  end if;
  if to_regprocedure('public.submit_guest_rsvp(text,text,jsonb,text)') is null then
    raise exception 'Missing public.submit_guest_rsvp(text,text,jsonb,text). Apply the latest RSVP migration first.';
  end if;
end
$$;

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

-- Defense in depth for profile roles. Couples may edit only their own name and
-- phone through PostgREST. Role changes must use a trusted service-role or SQL
-- session; the trigger also blocks accidental future grant regressions.
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

-- Normalize table grants. Supabase projects may begin with broad default
-- grants, including TRUNCATE, which bypasses row-level security.
revoke all privileges on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone) on table public.profiles to authenticated;

revoke all privileges on table public.themes from public, anon, authenticated;
revoke all privileges on table public.reveal_variations from public, anon, authenticated;
revoke all privileges on table public.music_options from public, anon, authenticated;
grant select on table public.themes to anon, authenticated;
grant select on table public.reveal_variations to anon, authenticated;
grant select on table public.music_options to anon, authenticated;
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

-- Replace overlapping profile read policies with two canonical policies.
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can read own profile or admins can read all" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;

create policy "Users can read own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "Users can update own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Admins can read all profiles"
on public.profiles for select to authenticated
using (public.is_admin());

-- Remove every direct public/anonymous policy from private guest data. Public
-- invite lookup and RSVP submission are available only through invite-code
-- validated security-definer RPCs.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('guests', 'guest_event_invites', 'guest_message_history', 'rsvp_responses')
      and (
        policyname ilike 'public%'
        or 'anon' = any(roles)
        or 'public' = any(roles)
      )
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_row.policyname,
      policy_row.tablename
    );
  end loop;
end
$$;

-- Consolidate duplicate event policies left by earlier repair migrations.
drop policy if exists "Couples can read own events" on public.events;
drop policy if exists "Couples can insert own events" on public.events;
drop policy if exists "Couples can update own events" on public.events;
drop policy if exists "Couples can delete own events" on public.events;
drop policy if exists "Couples can manage own events" on public.events;
drop policy if exists "Admins can read all events" on public.events;
drop policy if exists "Admins can insert all events" on public.events;
drop policy if exists "Admins can update all events" on public.events;
drop policy if exists "Admins can delete all events" on public.events;
drop policy if exists "Admins can manage all events" on public.events;

create policy "Couples can manage own events"
on public.events for all to authenticated
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

create policy "Admins can manage all events"
on public.events for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Consolidate duplicate guest policies.
drop policy if exists "Couples can read own guests" on public.guests;
drop policy if exists "Couples can insert own guests" on public.guests;
drop policy if exists "Couples can update own guests" on public.guests;
drop policy if exists "Couples can delete own guests" on public.guests;
drop policy if exists "Couples can manage own guests" on public.guests;
drop policy if exists "Admins can read all guests" on public.guests;
drop policy if exists "Admins can insert all guests" on public.guests;
drop policy if exists "Admins can update all guests" on public.guests;
drop policy if exists "Admins can delete all guests" on public.guests;
drop policy if exists "Admins can manage all guests" on public.guests;

create policy "Couples can manage own guests"
on public.guests for all to authenticated
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

create policy "Admins can manage all guests"
on public.guests for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Consolidate duplicate guest-event assignment policies.
drop policy if exists "Couples can read own guest event invites" on public.guest_event_invites;
drop policy if exists "Couples can insert own guest event invites" on public.guest_event_invites;
drop policy if exists "Couples can update own guest event invites" on public.guest_event_invites;
drop policy if exists "Couples can delete own guest event invites" on public.guest_event_invites;
drop policy if exists "Couples can manage own guest event invites" on public.guest_event_invites;
drop policy if exists "Admins can read all guest event invites" on public.guest_event_invites;
drop policy if exists "Admins can insert all guest event invites" on public.guest_event_invites;
drop policy if exists "Admins can update all guest event invites" on public.guest_event_invites;
drop policy if exists "Admins can delete all guest event invites" on public.guest_event_invites;
drop policy if exists "Admins can manage all guest event invites" on public.guest_event_invites;

create policy "Couples can manage own guest event invites"
on public.guest_event_invites for all to authenticated
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

create policy "Admins can manage all guest event invites"
on public.guest_event_invites for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- The ALL admin policy already includes SELECT.
drop policy if exists "Admins can read all wedding settings" on public.wedding_settings;

-- Public RPC execution remains available, while direct private-table access is
-- removed. Revoke PUBLIC first because it includes anon and authenticated.
revoke all on function public.get_public_invite_by_code(text, text) from public;
revoke all on function public.submit_guest_rsvp(text, text, jsonb, text) from public;
grant execute on function public.get_public_invite_by_code(text, text) to anon, authenticated;
grant execute on function public.submit_guest_rsvp(text, text, jsonb, text) to anon, authenticated;

-- A public bucket still serves exact public object URLs. Object metadata and
-- listing are restricted to the wedding owner or an admin.
drop policy if exists "Users can read wedding assets" on storage.objects;
drop policy if exists "Couples and admins can read wedding asset metadata" on storage.objects;
drop policy if exists "Couples and admins can upload wedding assets" on storage.objects;
drop policy if exists "Couples and admins can update wedding assets" on storage.objects;
drop policy if exists "Couples and admins can delete wedding assets" on storage.objects;

create policy "Couples and admins can read wedding asset metadata"
on storage.objects for select to authenticated
using (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and exists (
    select 1 from public.weddings
    where weddings.id::text = (storage.foldername(name))[2]
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

create policy "Couples and admins can upload wedding assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and exists (
    select 1 from public.weddings
    where weddings.id::text = (storage.foldername(name))[2]
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

create policy "Couples and admins can update wedding assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and exists (
    select 1 from public.weddings
    where weddings.id::text = (storage.foldername(name))[2]
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
)
with check (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and exists (
    select 1 from public.weddings
    where weddings.id::text = (storage.foldername(name))[2]
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

create policy "Couples and admins can delete wedding assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.weddings
      where weddings.id::text = (storage.foldername(name))[2]
        and weddings.owner_id = auth.uid()
    )
  )
);

notify pgrst, 'reload schema';

commit;
