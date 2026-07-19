-- Adds optional RSVP attendee-count capture.
-- Run this in Supabase SQL editor, then refresh/retry the app if schema cache is stale.

alter table public.wedding_settings
  add column if not exists rsvp_attending_count_enabled boolean not null default true;

alter table public.rsvp_responses
  add column if not exists attending_count integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rsvp_responses_attending_count_check'
  ) then
    alter table public.rsvp_responses
      add constraint rsvp_responses_attending_count_check
      check (attending_count >= 0);
  end if;
end $$;

create or replace function public.submit_guest_rsvp(wedding_slug text, invite_code text, responses jsonb, meal_preference text)
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
  response_attending_count integer;
  response_invited_count integer;
  saved_count integer := 0;
begin
  if jsonb_typeof(coalesce($3, '[]'::jsonb)) <> 'array' then
    raise exception 'Responses must be a JSON array.' using errcode = '22023';
  end if;
  if coalesce($4, '') not in ('', 'veg', 'nonVeg', 'jain') then
    raise exception 'Invalid meal preference.' using errcode = '22023';
  end if;

  select * into target_wedding
  from public.weddings
  where slug = $1 and status = 'published' and payment_status = 'paid';
  if not found then raise exception 'Wedding is unavailable.' using errcode = '42501'; end if;
  if target_wedding.package_type not in ('rsvp', 'whatsapp') then
    raise exception 'RSVP management is not enabled for this wedding.' using errcode = '42501';
  end if;

  select * into target_guest
  from public.guests
  where wedding_id = target_wedding.id and guests.invite_code = $2;
  if not found then raise exception 'Invalid invitation code.' using errcode = '42501'; end if;

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

    select coalesce(invite.invited_count, target_guest.invited_count, 1)
    into response_invited_count
    from public.guest_event_invites as invite
    where invite.wedding_id = target_wedding.id
      and invite.guest_id = target_guest.id
      and invite.event_id = response_event_id;

    if response_invited_count is null then
      raise exception 'This invitation does not include one or more submitted events.' using errcode = '42501';
    end if;

    response_attending_count := case
      when response_status = 'yes' then greatest(0, least(coalesce((response_item ->> 'attending_count')::integer, response_invited_count), response_invited_count))
      else 0
    end;

    insert into public.rsvp_responses (wedding_id, guest_id, event_id, status, attending_count)
    values (target_wedding.id, target_guest.id, response_event_id, response_status, response_attending_count)
    on conflict (guest_id, event_id)
    do update set status = excluded.status, attending_count = excluded.attending_count, updated_at = now();
    saved_count := saved_count + 1;
  end loop;

  update public.guests set meal_preference = nullif($4, '')
  where id = target_guest.id and wedding_id = target_wedding.id;
  return jsonb_build_object('success', true, 'saved_count', saved_count);
end;
$$;
