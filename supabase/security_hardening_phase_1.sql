-- Shaadi Nyota production security hardening - Phase 1.
--
-- Run after the current schema and RLS policies. This migration:
-- - requires paid + published for public invite reads
-- - removes anonymous direct access to guest/RSVP tables
-- - adds secure personalized invite lookup and RSVP submission RPCs
-- - blocks couples from changing protected wedding control fields
-- - adds the missing auth-user profile trigger and backfills profiles
--
-- Rollback notes:
-- - Drop the functions added below if the frontend must temporarily revert:
--     drop function if exists public.get_public_invite_by_code(text, text);
--     drop function if exists public.submit_guest_rsvp(text, text, jsonb, text);
--     drop function if exists public.request_payment_verification(uuid);
-- - Drop trigger weddings_protect_control_fields to temporarily remove protected
--   field enforcement. Do not restore anonymous guest/RSVP table access in
--   production; use the previous public policies only for an emergency local test.

begin;

-- Keep signup reproducible. Existing profile rows are preserved.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name, phone)
select
  users.id,
  nullif(users.raw_user_meta_data ->> 'full_name', ''),
  nullif(users.raw_user_meta_data ->> 'phone', '')
from auth.users as users
on conflict (id) do nothing;

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

-- Couples may edit normal wedding identity fields, but only admins may change
-- package/payment/publication/ownership controls. The payment request RPC sets
-- a transaction-local flag for the one allowed couple-controlled transition.
create or replace function public.protect_wedding_control_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.package_type is distinct from old.package_type
    or new.status is distinct from old.status
    or new.published_at is distinct from old.published_at
    or new.owner_id is distinct from old.owner_id
    or new.created_by is distinct from old.created_by
  then
    raise exception 'Only an admin can change wedding plan, publication, or ownership fields.'
      using errcode = '42501';
  end if;

  if new.payment_status is distinct from old.payment_status
    and coalesce(current_setting('app.allow_payment_verification_request', true), '') <> 'on'
  then
    raise exception 'Use request_payment_verification to change payment verification status.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists weddings_protect_control_fields on public.weddings;
create trigger weddings_protect_control_fields
before update on public.weddings
for each row execute function public.protect_wedding_control_fields();

create or replace function public.request_payment_verification(wedding_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
begin
  select *
  into target_wedding
  from public.weddings
  where id = $1
    and owner_id = auth.uid();

  if not found then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;

  if target_wedding.payment_status = 'paid' then
    return jsonb_build_object('success', false, 'payment_status', 'paid', 'message', 'Payment is already verified.');
  end if;

  perform set_config('app.allow_payment_verification_request', 'on', true);

  update public.weddings
  set payment_status = 'manual_pending'
  where id = target_wedding.id;

  return jsonb_build_object('success', true, 'payment_status', 'manual_pending');
end;
$$;

-- Return only the matching guest and that guest's assigned events/responses.
create or replace function public.get_public_invite_by_code(
  wedding_slug text,
  invite_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  target_guest public.guests%rowtype;
begin
  select *
  into target_wedding
  from public.weddings
  where slug = $1
    and status = 'published'
    and payment_status = 'paid';

  if not found then
    return null;
  end if;

  select *
  into target_guest
  from public.guests
  where wedding_id = target_wedding.id
    and guests.invite_code = $2;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'wedding', to_jsonb(target_wedding) - 'owner_id' - 'created_by',
    'settings', (
      select to_jsonb(settings)
      from public.wedding_settings as settings
      where settings.wedding_id = target_wedding.id
    ),
    'guest', to_jsonb(target_guest),
    'events', coalesce((
      select jsonb_agg(to_jsonb(event_row) order by event_row.sort_order)
      from public.events as event_row
      join public.guest_event_invites as invite
        on invite.wedding_id = target_wedding.id
       and invite.guest_id = target_guest.id
       and invite.event_id = event_row.id
      where event_row.wedding_id = target_wedding.id
    ), '[]'::jsonb),
    'rsvp_responses', coalesce((
      select jsonb_agg(to_jsonb(response_row) order by response_row.updated_at)
      from public.rsvp_responses as response_row
      where response_row.wedding_id = target_wedding.id
        and response_row.guest_id = target_guest.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_guest_rsvp(
  wedding_slug text,
  invite_code text,
  responses jsonb,
  meal_preference text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  target_guest public.guests%rowtype;
  response_item jsonb;
  response_event_id uuid;
  response_status text;
  saved_count integer := 0;
begin
  if jsonb_typeof(coalesce($3, '[]'::jsonb)) <> 'array' then
    raise exception 'Responses must be a JSON array.' using errcode = '22023';
  end if;

  if coalesce($4, '') not in ('', 'veg', 'nonVeg', 'jain') then
    raise exception 'Invalid meal preference.' using errcode = '22023';
  end if;

  select *
  into target_wedding
  from public.weddings
  where slug = $1
    and status = 'published'
    and payment_status = 'paid';

  if not found then
    raise exception 'Wedding is unavailable.' using errcode = '42501';
  end if;

  if target_wedding.package_type not in ('rsvp', 'whatsapp') then
    raise exception 'RSVP management is not enabled for this wedding.' using errcode = '42501';
  end if;

  select *
  into target_guest
  from public.guests
  where wedding_id = target_wedding.id
    and guests.invite_code = $2;

  if not found then
    raise exception 'Invalid invitation code.' using errcode = '42501';
  end if;

  for response_item in select value from jsonb_array_elements(coalesce($3, '[]'::jsonb))
  loop
    begin
      response_event_id := (response_item ->> 'event_id')::uuid;
    exception when others then
      raise exception 'Invalid event ID.' using errcode = '22023';
    end;

    response_status := response_item ->> 'status';
    if response_status is null or response_status not in ('yes', 'no', 'maybe') then
      raise exception 'Invalid RSVP status.' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.guest_event_invites as invite
      where invite.wedding_id = target_wedding.id
        and invite.guest_id = target_guest.id
        and invite.event_id = response_event_id
    ) then
      raise exception 'This invitation does not include one or more submitted events.'
        using errcode = '42501';
    end if;

    insert into public.rsvp_responses (wedding_id, guest_id, event_id, status)
    values (target_wedding.id, target_guest.id, response_event_id, response_status)
    on conflict (guest_id, event_id)
    do update set status = excluded.status, updated_at = now();

    saved_count := saved_count + 1;
  end loop;

  update public.guests
  set meal_preference = nullif($4, '')
  where id = target_guest.id
    and wedding_id = target_wedding.id;

  return jsonb_build_object('success', true, 'saved_count', saved_count);
end;
$$;

revoke all on function public.get_public_invite_by_code(text, text) from public;
revoke all on function public.submit_guest_rsvp(text, text, jsonb, text) from public;
revoke all on function public.request_payment_verification(uuid) from public;
grant execute on function public.get_public_invite_by_code(text, text) to anon, authenticated;
grant execute on function public.submit_guest_rsvp(text, text, jsonb, text) to anon, authenticated;
grant execute on function public.request_payment_verification(uuid) to authenticated;

-- Public base invite data is readable only when both paid and published.
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

-- Personalized public access now goes through RPCs only.
drop policy if exists "Public can read published invite guests" on public.guests;
drop policy if exists "Public can update published guest meal preference" on public.guests;
drop policy if exists "Public can read published guest event invites" on public.guest_event_invites;
drop policy if exists "Public can read published valid RSVP responses" on public.rsvp_responses;
drop policy if exists "Public can insert published valid RSVP responses" on public.rsvp_responses;
drop policy if exists "Public can update published valid RSVP responses" on public.rsvp_responses;
drop policy if exists "Public invite can read guests" on public.guests;
drop policy if exists "Public invite can update guest meal preference" on public.guests;
drop policy if exists "Public invite can read guest event invites" on public.guest_event_invites;
drop policy if exists "Public invite can read RSVP responses" on public.rsvp_responses;
drop policy if exists "Public invite can insert RSVP responses" on public.rsvp_responses;
drop policy if exists "Public invite can update RSVP responses" on public.rsvp_responses;

revoke all privileges on public.guests from anon;
revoke all privileges on public.guest_event_invites from anon;
revoke all privileges on public.rsvp_responses from anon;

notify pgrst, 'reload schema';

commit;
