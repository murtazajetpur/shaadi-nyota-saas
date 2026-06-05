-- Public invite access repair script after security hardening Phase 1.
--
-- Run supabase/security_hardening_phase_1.sql first. Personalized guest lookup
-- and RSVP submission must use the secure RPCs; this script intentionally does
-- not restore anonymous access to guests, guest_event_invites, or RSVP rows.

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

drop policy if exists "Public can read published weddings" on public.weddings;
drop policy if exists "Public can read paid published weddings" on public.weddings;
create policy "Public can read paid published weddings"
on public.weddings
for select
to anon, authenticated
using (status = 'published' and payment_status = 'paid');

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

drop policy if exists "Public can read published invite guests" on public.guests;
drop policy if exists "Public can update published guest meal preference" on public.guests;
drop policy if exists "Public can read published guest event invites" on public.guest_event_invites;
drop policy if exists "Public can read published valid RSVP responses" on public.rsvp_responses;
drop policy if exists "Public can insert published valid RSVP responses" on public.rsvp_responses;
drop policy if exists "Public can update published valid RSVP responses" on public.rsvp_responses;

revoke all privileges on public.guests from anon;
revoke all privileges on public.guest_event_invites from anon;
revoke all privileges on public.rsvp_responses from anon;

grant execute on function public.get_public_invite_by_code(text, text) to anon, authenticated;
grant execute on function public.submit_guest_rsvp(text, text, jsonb, text) to anon, authenticated;
