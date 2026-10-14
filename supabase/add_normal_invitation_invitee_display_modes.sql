-- Persist All-versus-number presentation for personalized invitations.
-- Apply after data_integrity_phase_2.sql, add_event_invited_counts.sql,
-- add_guest_limits_and_pagination.sql, and guest_autosave_and_save_reliability.sql.

begin;

alter table public.guest_event_invites
  add column if not exists invitee_count_display_mode text;

alter table public.guest_event_invites
  drop constraint if exists guest_event_invites_invitee_count_display_mode_check;

alter table public.guest_event_invites
  add constraint guest_event_invites_invitee_count_display_mode_check
  check (invitee_count_display_mode in ('all', 'number'));

comment on column public.guest_event_invites.invitee_count_display_mode is
  'Explicit All or numeric display override. Null preserves the legacy default: All when event count matches Family Size, and numeric when it differs.';

create or replace function public.apply_guest_invitee_display_modes(
  target_wedding_id uuid,
  target_guest_id uuid,
  event_display_modes jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  mode_item record;
begin
  if not public.can_manage_wedding(target_wedding_id) then
    raise exception 'Access denied.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.guests
    where id = target_guest_id and wedding_id = target_wedding_id
  ) then
    raise exception 'Guest does not belong to this wedding.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(event_display_modes, '{}'::jsonb)) <> 'object' then
    raise exception 'Event invitee display modes must be a JSON object.' using errcode = '22023';
  end if;

  update public.guest_event_invites
  set invitee_count_display_mode = null
  where wedding_id = target_wedding_id and guest_id = target_guest_id;

  for mode_item in
    select key as event_id, value as display_mode
    from jsonb_each_text(coalesce(event_display_modes, '{}'::jsonb))
  loop
    if mode_item.display_mode not in ('all', 'number') then
      raise exception 'Event invitee display mode must be All or number.' using errcode = '22023';
    end if;

    if mode_item.event_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Event invitee display mode references an invalid event.' using errcode = '22023';
    end if;

    update public.guest_event_invites
    set invitee_count_display_mode = mode_item.display_mode
    where wedding_id = target_wedding_id
      and guest_id = target_guest_id
      and event_id = mode_item.event_id::uuid;

    if not found then
      raise exception 'Event invitee display mode references an event not assigned to this guest.' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create or replace function public.save_wedding_guest_draft_with_invitee_display_modes(
  target_wedding_id uuid,
  guest_row jsonb,
  expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_payload jsonb;
  saved_guest_id uuid;
begin
  saved_payload := public.save_wedding_guest_draft(
    target_wedding_id,
    guest_row,
    expected_updated_at
  );
  saved_guest_id := (saved_payload #>> '{guest,id}')::uuid;

  perform public.apply_guest_invitee_display_modes(
    target_wedding_id,
    saved_guest_id,
    coalesce(guest_row -> 'invited_event_display_modes', '{}'::jsonb)
  );

  return jsonb_set(
    saved_payload,
    '{guest_event_invites}',
    coalesce((
      select jsonb_agg(to_jsonb(invite) order by invite.created_at)
      from public.guest_event_invites as invite
      where invite.wedding_id = target_wedding_id and invite.guest_id = saved_guest_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.save_wedding_guests_with_invitee_display_modes_transactional(
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
  saved_payload jsonb;
  guest_item jsonb;
  saved_guest_id uuid;
begin
  saved_payload := public.save_wedding_guests_transactional(
    target_wedding_id,
    guest_rows,
    guest_mode
  );

  for guest_item in select value from jsonb_array_elements(coalesce(guest_rows, '[]'::jsonb))
  loop
    select guest.id into saved_guest_id
    from public.guests as guest
    where guest.wedding_id = target_wedding_id
      and guest.invite_code = guest_item ->> 'invite_code';

    if saved_guest_id is null then
      raise exception 'Saved guest could not be resolved for invitee display modes.' using errcode = 'P0002';
    end if;

    perform public.apply_guest_invitee_display_modes(
      target_wedding_id,
      saved_guest_id,
      coalesce(guest_item -> 'invited_event_display_modes', '{}'::jsonb)
    );
  end loop;

  return jsonb_set(
    saved_payload,
    '{guest_event_invites}',
    coalesce((
      select jsonb_agg(to_jsonb(invite))
      from public.guest_event_invites as invite
      where invite.wedding_id = target_wedding_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.replace_guest_event_invites_with_display_modes_transactional(
  target_wedding_id uuid,
  target_guest_id uuid,
  event_ids jsonb,
  event_counts jsonb default '{}'::jsonb,
  event_display_modes jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_payload jsonb;
begin
  saved_payload := public.replace_guest_event_invites_transactional(
    target_wedding_id,
    target_guest_id,
    event_ids,
    event_counts
  );

  perform public.apply_guest_invitee_display_modes(
    target_wedding_id,
    target_guest_id,
    event_display_modes
  );

  return saved_payload || jsonb_build_object(
    'guest_event_invites', coalesce((
      select jsonb_agg(to_jsonb(invite) order by invite.created_at)
      from public.guest_event_invites as invite
      where invite.wedding_id = target_wedding_id and invite.guest_id = target_guest_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_public_invite_by_code(wedding_slug text, invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  target_guest public.guests%rowtype;
begin
  select * into target_wedding
  from public.weddings
  where slug = $1 and status = 'published' and payment_status = 'paid';
  if not found then return null; end if;

  select * into target_guest
  from public.guests
  where wedding_id = target_wedding.id and guests.invite_code = $2;
  if not found then return null; end if;

  return jsonb_build_object(
    'wedding', to_jsonb(target_wedding) - 'owner_id' - 'created_by',
    'settings', (select to_jsonb(settings) from public.wedding_settings as settings where settings.wedding_id = target_wedding.id),
    'guest', to_jsonb(target_guest),
    'events', coalesce((
      select jsonb_agg((to_jsonb(event_row) || jsonb_build_object(
        'guest_invited_count', coalesce(invite.invited_count, target_guest.invited_count, 1),
        'guest_invitee_count_display_mode', invite.invitee_count_display_mode
      )) order by event_row.sort_order)
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
      where response_row.wedding_id = target_wedding.id and response_row.guest_id = target_guest.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.apply_guest_invitee_display_modes(uuid, uuid, jsonb) from public;
revoke all on function public.save_wedding_guest_draft_with_invitee_display_modes(uuid, jsonb, timestamptz) from public;
revoke all on function public.save_wedding_guests_with_invitee_display_modes_transactional(uuid, jsonb, text) from public;
revoke all on function public.replace_guest_event_invites_with_display_modes_transactional(uuid, uuid, jsonb, jsonb, jsonb) from public;

grant execute on function public.save_wedding_guest_draft_with_invitee_display_modes(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.save_wedding_guests_with_invitee_display_modes_transactional(uuid, jsonb, text) to authenticated;
grant execute on function public.replace_guest_event_invites_with_display_modes_transactional(uuid, uuid, jsonb, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
