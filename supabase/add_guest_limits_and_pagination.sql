-- Guest capacity hardening for the RSVP dashboard.
-- Run after supabase/data_integrity_phase_2.sql and the latest event-field migrations.

begin;

alter table public.weddings
  add column if not exists guest_record_limit integer not null default 2000,
  add column if not exists invitee_limit integer not null default 10000;

-- Preserve weddings that already exceed the new defaults.
with usage as (
  select
    weddings.id,
    count(guests.id)::integer as guest_count,
    coalesce(sum(guests.invited_count), 0)::integer as people_count
  from public.weddings as weddings
  left join public.guests as guests on guests.wedding_id = weddings.id
  group by weddings.id
)
update public.weddings as weddings
set
  guest_record_limit = greatest(weddings.guest_record_limit, usage.guest_count),
  invitee_limit = greatest(weddings.invitee_limit, usage.people_count)
from usage
where usage.id = weddings.id;

do $$
begin
  alter table public.weddings
    add constraint weddings_guest_record_limit_check
    check (guest_record_limit between 1 and 10000);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.weddings
    add constraint weddings_invitee_limit_check
    check (invitee_limit between 1 and 100000);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.guests
    add constraint guests_family_size_max_check
    check (invited_count <= 20) not valid;
exception
  when duplicate_object then null;
end $$;

comment on column public.weddings.guest_record_limit is
  'Maximum guest/family records allowed for this wedding. Default 2000; admins may override up to 10000.';
comment on column public.weddings.invitee_limit is
  'Maximum total people across guest Family Size values. Default 10000; admins may override up to 100000.';

-- Couples cannot raise entitlements, and nobody can lower a limit below current usage.
create or replace function public.protect_wedding_control_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_guest_count integer;
  current_people_count integer;
begin
  if new.guest_record_limit is distinct from old.guest_record_limit
    or new.invitee_limit is distinct from old.invitee_limit
  then
    select count(*)::integer, coalesce(sum(invited_count), 0)::integer
    into current_guest_count, current_people_count
    from public.guests
    where wedding_id = old.id;

    if new.guest_record_limit < current_guest_count then
      raise exception 'Guest entry limit cannot be below the current guest count of %.', current_guest_count
        using errcode = '22023';
    end if;

    if new.invitee_limit < current_people_count then
      raise exception 'Total people limit cannot be below the current people count of %.', current_people_count
        using errcode = '22023';
    end if;
  end if;

  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.package_type is distinct from old.package_type
    or new.status is distinct from old.status
    or new.published_at is distinct from old.published_at
    or new.owner_id is distinct from old.owner_id
    or new.created_by is distinct from old.created_by
    or new.guest_record_limit is distinct from old.guest_record_limit
    or new.invitee_limit is distinct from old.invitee_limit
  then
    raise exception 'Only an admin can change wedding plan, publication, ownership, or guest capacity fields.'
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

create or replace function public.assert_wedding_guest_capacity(
  target_wedding_id uuid,
  guest_rows jsonb,
  guest_mode text default 'replace'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  submitted_guest_count integer;
  submitted_people_count integer;
  existing_guest_count integer;
  existing_people_count integer;
  final_guest_count integer;
  final_people_count integer;
begin
  if not public.can_manage_wedding(target_wedding_id) then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(guest_rows, '[]'::jsonb)) <> 'array' then
    raise exception 'Guests must be a JSON array.' using errcode = '22023';
  end if;

  if guest_mode not in ('replace', 'append') then
    raise exception 'Guest save mode must be replace or append.' using errcode = '22023';
  end if;

  select * into target_wedding
  from public.weddings
  where id = target_wedding_id
  for update;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(guest_rows, '[]'::jsonb)) as item
    where coalesce(nullif(item ->> 'invited_count', '')::integer, 0) > 20
  ) then
    raise exception 'Family Size cannot be more than 20 for one guest entry.' using errcode = '22023';
  end if;

  select count(*)::integer, coalesce(sum((item ->> 'invited_count')::integer), 0)::integer
  into submitted_guest_count, submitted_people_count
  from jsonb_array_elements(coalesce(guest_rows, '[]'::jsonb)) as item;

  select count(*)::integer, coalesce(sum(invited_count), 0)::integer
  into existing_guest_count, existing_people_count
  from public.guests
  where wedding_id = target_wedding_id;

  if guest_mode = 'replace' then
    final_guest_count := submitted_guest_count;
    final_people_count := submitted_people_count;
  else
    final_guest_count := existing_guest_count + submitted_guest_count;
    final_people_count := existing_people_count + submitted_people_count;
  end if;

  if final_guest_count > target_wedding.guest_record_limit then
    raise exception 'Guest entry limit of % exceeded. Submitted total: %.', target_wedding.guest_record_limit, final_guest_count
      using errcode = '22023';
  end if;

  if final_people_count > target_wedding.invitee_limit then
    raise exception 'Total people limit of % exceeded. Submitted total: %.', target_wedding.invitee_limit, final_people_count
      using errcode = '22023';
  end if;

  return jsonb_build_object(
    'success', true,
    'guest_count', final_guest_count,
    'people_count', final_people_count,
    'guest_record_limit', target_wedding.guest_record_limit,
    'invitee_limit', target_wedding.invitee_limit
  );
end;
$$;

-- Covers direct authenticated table writes. Transactional RPCs set a local flag
-- after validating their complete final payload, avoiding false failures while a
-- replace transaction temporarily contains both old and new rows.
create or replace function public.enforce_wedding_guest_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  current_guest_count integer;
  current_people_count integer;
begin
  if coalesce(current_setting('app.guest_capacity_validated_for', true), '') = new.wedding_id::text then
    return new;
  end if;

  select * into target_wedding
  from public.weddings
  where id = new.wedding_id
  for update;

  if new.invited_count > 20 then
    raise exception 'Family Size cannot be more than 20 for one guest entry.' using errcode = '22023';
  end if;

  select count(*)::integer, coalesce(sum(invited_count), 0)::integer
  into current_guest_count, current_people_count
  from public.guests
  where wedding_id = new.wedding_id
    and id <> new.id;

  if current_guest_count + 1 > target_wedding.guest_record_limit then
    raise exception 'Guest entry limit of % exceeded.', target_wedding.guest_record_limit using errcode = '22023';
  end if;

  if current_people_count + new.invited_count > target_wedding.invitee_limit then
    raise exception 'Total people limit of % exceeded.', target_wedding.invitee_limit using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists guests_enforce_wedding_capacity on public.guests;
create trigger guests_enforce_wedding_capacity
before insert or update of wedding_id, invited_count on public.guests
for each row execute function public.enforce_wedding_guest_capacity();

-- Shared entry point for full dashboard saves. The existing Phase 2 function
-- remains the transaction owner and compatibility fallback.
create or replace function public.save_wedding_relational_data_limited(
  target_wedding_id uuid,
  event_rows jsonb,
  guest_rows jsonb,
  guest_mode text default 'replace'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_wedding_guest_capacity(target_wedding_id, guest_rows, guest_mode);
  perform set_config('app.guest_capacity_validated_for', target_wedding_id::text, true);
  return public.save_wedding_relational_data(target_wedding_id, event_rows, guest_rows, guest_mode);
end;
$$;

-- Keep CSV/import callers on the existing RPC name while adding the same limit validation.
create or replace function public.save_wedding_guests_transactional(
  target_wedding_id uuid,
  guest_rows jsonb,
  guest_mode text default 'replace'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_events jsonb;
begin
  if not public.can_manage_wedding(target_wedding_id) then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'event_key', event_key,
    'event_visual_key', event_visual_key,
    'event_text_style', event_text_style,
    'event_text_position', event_text_position,
    'event_animation_key', event_animation_key,
    'event_show_calendar', event_show_calendar,
    'event_show_invited_count', event_show_invited_count,
    'event_name', event_name,
    'date_label', date_label,
    'start_time_label', start_time_label,
    'venue_name', venue_name,
    'city', city,
    'maps_url', maps_url,
    'dress_code', dress_code,
    'foreground_image_src', foreground_image_src,
    'background_image_src', background_image_src,
    'calendar_title', calendar_title,
    'calendar_description', calendar_description,
    'sort_order', sort_order
  ) order by sort_order), '[]'::jsonb)
  into current_events
  from public.events
  where wedding_id = target_wedding_id;

  return public.save_wedding_relational_data_limited(target_wedding_id, current_events, guest_rows, guest_mode);
end;
$$;

revoke all on function public.assert_wedding_guest_capacity(uuid, jsonb, text) from public;
revoke all on function public.save_wedding_relational_data_limited(uuid, jsonb, jsonb, text) from public;
revoke all on function public.save_wedding_guests_transactional(uuid, jsonb, text) from public;

grant execute on function public.save_wedding_relational_data_limited(uuid, jsonb, jsonb, text) to authenticated;
grant execute on function public.save_wedding_guests_transactional(uuid, jsonb, text) to authenticated;

notify pgrst, 'reload schema';

commit;