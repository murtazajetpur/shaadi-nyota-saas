-- Add a per-link invitee-count visibility setting.
--
-- Run this on existing projects after the Open Invitations migrations, then
-- rerun supabase/upsert_open_invitation_rsvp.sql so public submissions enforce
-- one person per response whenever the invitee count is hidden.

begin;

alter table public.open_invitations
  add column if not exists show_invitee_count boolean not null default true;

comment on column public.open_invitations.show_invitee_count is
  'Whether respondents can choose and see the number of invitees. Hidden-count invitations always register one person per response.';

create or replace function public.list_open_invitations(target_wedding_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  result jsonb;
begin
  select * into target_wedding
  from public.weddings
  where id = target_wedding_id;

  if not found
    or auth.uid() is null
    or (target_wedding.owner_id is distinct from auth.uid() and not public.is_admin())
  then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', invitation.id,
      'wedding_id', invitation.wedding_id,
      'label', invitation.label,
      'category', invitation.category,
      'invite_code', invitation.invite_code,
      'is_active', invitation.is_active,
      'max_party_size', invitation.max_party_size,
      'show_invitee_count', invitation.show_invitee_count,
      'meal_preference_enabled', invitation.meal_preference_enabled,
      'expires_at', invitation.expires_at,
      'created_at', invitation.created_at,
      'updated_at', invitation.updated_at,
      'event_ids', (
        select coalesce(jsonb_agg(event_row.id order by event_row.sort_order, event_row.created_at), '[]'::jsonb)
        from public.open_invitation_events as assignment
        join public.events as event_row on event_row.id = assignment.event_id
        where assignment.open_invitation_id = invitation.id
      ),
      'response_count', (
        select count(*)::integer
        from public.guests as guest_row
        where guest_row.open_invitation_id = invitation.id
      ),
      'registered_people', (
        select coalesce(sum(guest_row.invited_count), 0)::integer
        from public.guests as guest_row
        where guest_row.open_invitation_id = invitation.id
      )
    ) order by invitation.created_at desc
  ), '[]'::jsonb)
  into result
  from public.open_invitations as invitation
  where invitation.wedding_id = target_wedding_id;

  return result;
end;
$$;

create or replace function public.save_open_invitation(
  target_wedding_id uuid,
  invitation_row jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  saved_invitation public.open_invitations%rowtype;
  invitation_id_text text := btrim(coalesce(invitation_row ->> 'id', ''));
  event_refs jsonb := coalesce(invitation_row -> 'event_ids', '[]'::jsonb);
  requested_id uuid;
  requested_label text := btrim(coalesce(invitation_row ->> 'label', ''));
  requested_category text := btrim(coalesce(invitation_row ->> 'category', ''));
  requested_max_party integer := coalesce(nullif(invitation_row ->> 'max_party_size', '')::integer, 20);
  requested_show_invitee_count boolean := coalesce((invitation_row ->> 'show_invitee_count')::boolean, true);
  requested_meal_preference_enabled boolean := coalesce((invitation_row ->> 'meal_preference_enabled')::boolean, true);
  requested_expires_at timestamptz := nullif(invitation_row ->> 'expires_at', '')::timestamptz;
  requested_active boolean := coalesce((invitation_row ->> 'is_active')::boolean, true);
begin
  select * into target_wedding
  from public.weddings
  where id = target_wedding_id
  for update;

  if not found
    or auth.uid() is null
    or (target_wedding.owner_id is distinct from auth.uid() and not public.is_admin())
  then
    raise exception 'Wedding not found or access denied.' using errcode = '42501';
  end if;

  if target_wedding.package_type not in ('rsvp', 'whatsapp') and not public.is_admin() then
    raise exception 'Open Invitations require the Pro plan.' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(invitation_row, '{}'::jsonb)) <> 'object' then
    raise exception 'Open invitation data must be an object.' using errcode = '22023';
  end if;
  if requested_label = '' or char_length(requested_label) > 80 then
    raise exception 'Open invitation name must contain between 1 and 80 characters.' using errcode = '22023';
  end if;
  if char_length(requested_category) > 80 then
    raise exception 'Guest category cannot contain more than 80 characters.' using errcode = '22023';
  end if;
  if requested_max_party < 1 or requested_max_party > 20 then
    raise exception 'Maximum group size must be between 1 and 20.' using errcode = '22023';
  end if;
  if jsonb_typeof(event_refs) <> 'array' or jsonb_array_length(event_refs) = 0 then
    raise exception 'Select at least one event for this Open Invitation.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements_text(event_refs) as requested(event_id)
    where not exists (
      select 1 from public.events
      where events.id::text = requested.event_id
        and events.wedding_id = target_wedding_id
    )
  ) then
    raise exception 'One or more selected events do not belong to this wedding.' using errcode = '22023';
  end if;

  if invitation_id_text = '' then
    insert into public.open_invitations (
      wedding_id, label, category, is_active, max_party_size,
      show_invitee_count, meal_preference_enabled, expires_at, created_by
    ) values (
      target_wedding_id, requested_label, requested_category, requested_active,
      requested_max_party, requested_show_invitee_count,
      requested_meal_preference_enabled, requested_expires_at, auth.uid()
    )
    returning * into saved_invitation;
  else
    begin
      requested_id := invitation_id_text::uuid;
    exception when invalid_text_representation then
      raise exception 'Open invitation ID is invalid.' using errcode = '22023';
    end;

    update public.open_invitations
    set label = requested_label,
        category = requested_category,
        is_active = requested_active,
        max_party_size = requested_max_party,
        max_total_attendees = null,
        show_invitee_count = requested_show_invitee_count,
        meal_preference_enabled = requested_meal_preference_enabled,
        expires_at = requested_expires_at
    where id = requested_id
      and wedding_id = target_wedding_id
    returning * into saved_invitation;

    if not found then
      raise exception 'Open invitation not found.' using errcode = 'P0002';
    end if;
  end if;

  delete from public.open_invitation_events
  where open_invitation_id = saved_invitation.id;

  insert into public.open_invitation_events (wedding_id, open_invitation_id, event_id)
  select target_wedding_id, saved_invitation.id, event_row.id
  from public.events as event_row
  join (
    select distinct requested.event_id
    from jsonb_array_elements_text(event_refs) as requested(event_id)
  ) as requested on requested.event_id = event_row.id::text
  where event_row.wedding_id = target_wedding_id;

  return jsonb_build_object(
    'success', true,
    'id', saved_invitation.id,
    'invite_code', saved_invitation.invite_code
  );
end;
$$;

create or replace function public.get_public_open_invitation_by_code(
  wedding_slug text,
  open_invite_code text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  target_invitation public.open_invitations%rowtype;
  target_settings public.wedding_settings%rowtype;
  event_rows jsonb;
begin
  select wedding.* into target_wedding
  from public.weddings as wedding
  where wedding.slug = btrim(coalesce(wedding_slug, ''))
    and wedding.status = 'published'
    and wedding.payment_status = 'paid'
    and wedding.package_type in ('rsvp', 'whatsapp');

  if not found then
    return null;
  end if;

  select invitation.* into target_invitation
  from public.open_invitations as invitation
  where invitation.wedding_id = target_wedding.id
    and invitation.invite_code = btrim(coalesce(open_invite_code, ''))
    and invitation.is_active
    and (invitation.expires_at is null or invitation.expires_at > now());

  if not found then
    return null;
  end if;

  select * into target_settings
  from public.wedding_settings
  where wedding_id = target_wedding.id;

  select coalesce(jsonb_agg(
    to_jsonb(event_row) || jsonb_build_object(
      'guest_invited_count', case when target_invitation.show_invitee_count then target_invitation.max_party_size else null end,
      'event_show_invited_count', event_row.event_show_invited_count and target_invitation.show_invitee_count
    )
    order by event_row.sort_order, event_row.created_at
  ), '[]'::jsonb)
  into event_rows
  from public.open_invitation_events as assignment
  join public.events as event_row on event_row.id = assignment.event_id
  where assignment.open_invitation_id = target_invitation.id;

  return jsonb_build_object(
    'wedding', to_jsonb(target_wedding) - 'owner_id' - 'created_by',
    'settings', case when target_settings.id is null then null else to_jsonb(target_settings) end,
    'open_invitation', jsonb_build_object(
      'id', target_invitation.id,
      'label', target_invitation.label,
      'category', target_invitation.category,
      'invite_code', target_invitation.invite_code,
      'max_party_size', target_invitation.max_party_size,
      'show_invitee_count', target_invitation.show_invitee_count,
      'meal_preference_enabled', target_invitation.meal_preference_enabled,
      'expires_at', target_invitation.expires_at
    ),
    'events', event_rows
  );
end;
$$;

revoke all on function public.list_open_invitations(uuid) from public;
revoke all on function public.save_open_invitation(uuid, jsonb) from public;
revoke all on function public.get_public_open_invitation_by_code(text, text) from public;

grant execute on function public.list_open_invitations(uuid) to authenticated;
grant execute on function public.save_open_invitation(uuid, jsonb) to authenticated;
grant execute on function public.get_public_open_invitation_by_code(text, text) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
