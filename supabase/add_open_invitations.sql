-- Open Invitations
--
-- Run after the current schema, Phase 1 security hardening, Phase 2 data
-- integrity migration, and guest autosave migration. This migration is
-- idempotent and keeps all open-invitation reads/writes behind validated RPCs.

create table if not exists public.open_invitations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 80),
  category text not null default '' check (char_length(btrim(category)) <= 80),
  invite_code text not null default encode(extensions.gen_random_bytes(9), 'hex'),
  is_active boolean not null default true,
  max_party_size integer not null default 20 check (max_party_size between 1 and 20),
  max_total_attendees integer check (max_total_attendees is null or max_total_attendees between 1 and 100000),
  show_invitee_count boolean not null default true,
  meal_preference_enabled boolean not null default true,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, invite_code)
);

alter table public.open_invitations
  add column if not exists show_invitee_count boolean not null default true;

alter table public.open_invitations
  add column if not exists meal_preference_enabled boolean not null default true;

comment on table public.open_invitations is
  'Reusable group invitation links. Respondents become normal guest records after submitting RSVP.';
comment on column public.open_invitations.max_party_size is
  'Maximum self-selected group size for one response. The wedding invitee limit still applies.';
comment on column public.open_invitations.max_total_attendees is
  'Deprecated compatibility field. Open Invitation links no longer enforce a link-wide response or attendee cap.';
comment on column public.open_invitations.show_invitee_count is
  'Whether respondents can choose and see the number of invitees. Hidden-count invitations always register one person per response.';
comment on column public.open_invitations.meal_preference_enabled is
  'Whether this Open Invitation asks respondents with a Yes or Maybe response for meal preference.';

drop trigger if exists open_invitations_set_updated_at on public.open_invitations;
create trigger open_invitations_set_updated_at
before update on public.open_invitations
for each row execute function public.set_updated_at();

create index if not exists open_invitations_wedding_created_idx
  on public.open_invitations (wedding_id, created_at desc);
create index if not exists open_invitations_code_idx
  on public.open_invitations (wedding_id, invite_code);

create table if not exists public.open_invitation_events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  open_invitation_id uuid not null references public.open_invitations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (open_invitation_id, event_id)
);

comment on table public.open_invitation_events is
  'Events visible through one reusable Open Invitation link.';

create index if not exists open_invitation_events_wedding_idx
  on public.open_invitation_events (wedding_id);
create index if not exists open_invitation_events_event_idx
  on public.open_invitation_events (event_id);

create or replace function public.validate_open_invitation_event_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.open_invitations as invitation
    join public.events as event_row
      on event_row.id = new.event_id
    where invitation.id = new.open_invitation_id
      and invitation.wedding_id = new.wedding_id
      and event_row.wedding_id = new.wedding_id
  ) then
    raise exception 'Open invitation and event must belong to the same wedding.' using errcode = '23503';
  end if;

  return new;
end;
$$;

drop trigger if exists open_invitation_events_validate_scope on public.open_invitation_events;
create trigger open_invitation_events_validate_scope
before insert or update of wedding_id, open_invitation_id, event_id
on public.open_invitation_events
for each row execute function public.validate_open_invitation_event_scope();

alter table public.guests
  add column if not exists open_invitation_id uuid references public.open_invitations(id) on delete set null;

create index if not exists guests_open_invitation_idx
  on public.guests (open_invitation_id, created_at desc)
  where open_invitation_id is not null;

comment on column public.guests.open_invitation_id is
  'Shared Open Invitation that created this guest, when applicable.';

alter table public.open_invitations enable row level security;
alter table public.open_invitation_events enable row level security;

-- Management is RPC-only. Public access is also RPC-only so a shared link can
-- never list other links, respondents, guests, or RSVP rows.
revoke all on table public.open_invitations from anon, authenticated;
revoke all on table public.open_invitation_events from anon, authenticated;

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

create or replace function public.regenerate_open_invitation_code(
  target_wedding_id uuid,
  target_open_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  next_code text := encode(extensions.gen_random_bytes(9), 'hex');
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

  update public.open_invitations
  set invite_code = next_code
  where id = target_open_invitation_id
    and wedding_id = target_wedding_id;

  if not found then
    raise exception 'Open invitation not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('success', true, 'invite_code', next_code);
end;
$$;

create or replace function public.delete_open_invitation(
  target_wedding_id uuid,
  target_open_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  deleted_count integer;
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

  delete from public.open_invitations
  where id = target_open_invitation_id
    and wedding_id = target_wedding_id;
  get diagnostics deleted_count = row_count;

  if deleted_count = 0 then
    raise exception 'Open invitation not found.' using errcode = 'P0002';
  end if;

  -- Submitted guests remain normal guest records. Their source reference is
  -- cleared by ON DELETE SET NULL and RSVP history remains intact.
  return jsonb_build_object('success', true, 'deleted', deleted_count);
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

create or replace function public.submit_open_invitation_rsvp(
  wedding_slug text,
  open_invite_code text,
  respondent_name text,
  respondent_phone text,
  party_size integer,
  responses jsonb,
  meal_preference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_wedding public.weddings%rowtype;
  target_invitation public.open_invitations%rowtype;
  canonical_phone text;
  clean_name text := btrim(coalesce(respondent_name, ''));
  clean_phone text := btrim(coalesce(respondent_phone, ''));
  clean_meal text := nullif(btrim(coalesce(meal_preference, '')), '');
  allowed_event_count integer;
  response_item jsonb;
  response_event_id uuid;
  response_status text;
  response_attending_count integer;
  created_guest_id uuid := gen_random_uuid();
  created_invite_code text;
  requires_phone boolean := false;
begin
  select invitation.* into target_invitation
  from public.open_invitations as invitation
  join public.weddings as wedding on wedding.id = invitation.wedding_id
  where wedding.slug = btrim(coalesce(wedding_slug, ''))
    and wedding.status = 'published'
    and wedding.payment_status = 'paid'
    and wedding.package_type in ('rsvp', 'whatsapp')
    and invitation.invite_code = btrim(coalesce(open_invite_code, ''))
    and invitation.is_active
    and (invitation.expires_at is null or invitation.expires_at > now())
  for update of invitation;

  if not found then
    raise exception 'This Open Invitation is invalid, paused, or expired.' using errcode = 'P0002';
  end if;

  select * into target_wedding
  from public.weddings
  where id = target_invitation.wedding_id
  for update;

  if clean_name = '' or char_length(clean_name) > 120 then
    raise exception 'Enter your name using no more than 120 characters.' using errcode = '22023';
  end if;


  if party_size is null or party_size < 1 or party_size > target_invitation.max_party_size then
    raise exception 'Group size must be between 1 and %.', target_invitation.max_party_size using errcode = '22023';
  end if;
  if not target_invitation.show_invitee_count and party_size <> 1 then
    raise exception 'Invitee count is hidden for this Open Invitation; group size must be 1.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(responses, '[]'::jsonb)) <> 'array' then
    raise exception 'RSVP responses must be an array.' using errcode = '22023';
  end if;

  select count(*)::integer into allowed_event_count
  from public.open_invitation_events
  where open_invitation_id = target_invitation.id;

  if allowed_event_count = 0
    or jsonb_array_length(responses) <> allowed_event_count
    or (
      select count(distinct item.value ->> 'event_id')
      from jsonb_array_elements(responses) as item
    ) <> allowed_event_count
  then
    raise exception 'Please answer every event in this invitation.' using errcode = '22023';
  end if;

  for response_item in select value from jsonb_array_elements(responses)
  loop
    begin
      response_event_id := (response_item ->> 'event_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'An RSVP event is invalid.' using errcode = '22023';
    end;
    response_status := btrim(coalesce(response_item ->> 'status', ''));
    response_attending_count := coalesce(nullif(response_item ->> 'attending_count', '')::integer, 0);

    if not exists (
      select 1 from public.open_invitation_events
      where open_invitation_id = target_invitation.id
        and event_id = response_event_id
    ) then
      raise exception 'An RSVP event is not included in this Open Invitation.' using errcode = '22023';
    end if;
    if response_status not in ('yes', 'no', 'maybe') then
      raise exception 'Choose Yes, No, or Maybe for every event.' using errcode = '22023';
    end if;
    if response_status in ('yes', 'maybe') then
      requires_phone := true;
    end if;
    if response_status = 'yes' and (response_attending_count < 1 or response_attending_count > party_size) then
      raise exception 'Attending count must be between 1 and your group size.' using errcode = '22023';
    end if;
    if response_status <> 'yes' and response_attending_count <> 0 then
      raise exception 'Attending count must be zero unless the response is Yes.' using errcode = '22023';
    end if;
  end loop;

  if requires_phone then
    begin
      canonical_phone := public.normalize_guest_phone_e164(clean_phone);
    exception when others then
      raise exception 'Enter a valid mobile number with its country code.' using errcode = '22023';
    end;
    if canonical_phone is null then
      raise exception 'Enter a valid mobile number with its country code.' using errcode = '22023';
    end if;
  else
    canonical_phone := null;
    clean_phone := '';
  end if;

  if not target_invitation.meal_preference_enabled or not requires_phone then
    clean_meal := null;
  elsif clean_meal is not null and clean_meal not in ('veg', 'nonVeg', 'jain') then
    raise exception 'Meal preference is invalid.' using errcode = '22023';
  end if;

  if canonical_phone is not null and exists (
    select 1 from public.guests
    where open_invitation_id = target_invitation.id
      and phone = canonical_phone
  ) then
    raise exception 'A response from this mobile number has already been submitted through this Open Invitation.' using errcode = '23505';
  end if;

  loop
    created_invite_code := encode(extensions.gen_random_bytes(9), 'hex');
    exit when not exists (
      select 1 from public.guests
      where wedding_id = target_wedding.id
        and invite_code = created_invite_code
    );
  end loop;

  insert into public.guests (
    id, wedding_id, guest_name, phone, phone_input, invited_count,
    category, invite_code, meal_preference, open_invitation_id
  ) values (
    created_guest_id, target_wedding.id, clean_name, canonical_phone, clean_phone,
    party_size, target_invitation.category, created_invite_code, clean_meal,
    target_invitation.id
  );

  insert into public.guest_event_invites (wedding_id, guest_id, event_id, invited_count)
  select target_wedding.id, created_guest_id, assignment.event_id, party_size
  from public.open_invitation_events as assignment
  where assignment.open_invitation_id = target_invitation.id;

  for response_item in select value from jsonb_array_elements(responses)
  loop
    response_event_id := (response_item ->> 'event_id')::uuid;
    response_status := response_item ->> 'status';
    response_attending_count := coalesce(nullif(response_item ->> 'attending_count', '')::integer, 0);

    insert into public.rsvp_responses (
      wedding_id, guest_id, event_id, status, attending_count
    ) values (
      target_wedding.id, created_guest_id, response_event_id,
      response_status, response_attending_count
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'guest_id', created_guest_id,
    'invite_code', created_invite_code,
    'guest_name', clean_name
  );
end;
$$;

revoke all on function public.list_open_invitations(uuid) from public;
revoke all on function public.save_open_invitation(uuid, jsonb) from public;
revoke all on function public.regenerate_open_invitation_code(uuid, uuid) from public;
revoke all on function public.delete_open_invitation(uuid, uuid) from public;
revoke all on function public.get_public_open_invitation_by_code(text, text) from public;
revoke all on function public.submit_open_invitation_rsvp(text, text, text, text, integer, jsonb, text) from public;

grant execute on function public.list_open_invitations(uuid) to authenticated;
grant execute on function public.save_open_invitation(uuid, jsonb) to authenticated;
grant execute on function public.regenerate_open_invitation_code(uuid, uuid) to authenticated;
grant execute on function public.delete_open_invitation(uuid, uuid) to authenticated;
grant execute on function public.get_public_open_invitation_by_code(text, text) to anon, authenticated;
grant execute on function public.submit_open_invitation_rsvp(text, text, text, text, integer, jsonb, text) to anon, authenticated;

notify pgrst, 'reload schema';
