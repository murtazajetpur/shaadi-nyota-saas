-- Open Invitation invite-code generation hotfix
--
-- Keeps the generator extension-qualified on Supabase projects where pgcrypto
-- functions are installed in the extensions schema. The current submit RPC is
-- included so running this hotfix cannot restore older RSVP or capacity rules.

alter table public.open_invitations
  add column if not exists show_invitee_count boolean not null default true;

alter table public.open_invitations
  add column if not exists meal_preference_enabled boolean not null default true;

comment on column public.open_invitations.show_invitee_count is
  'Whether respondents can choose and see the number of invitees. Hidden-count invitations always register one person per response.';

update public.open_invitations
set max_total_attendees = null
where max_total_attendees is not null;

alter table public.open_invitations
  alter column invite_code set default encode(extensions.gen_random_bytes(9), 'hex');

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

revoke all on function public.regenerate_open_invitation_code(uuid, uuid) from public;
revoke all on function public.submit_open_invitation_rsvp(text, text, text, text, integer, jsonb, text) from public;

grant execute on function public.regenerate_open_invitation_code(uuid, uuid) to authenticated;
grant execute on function public.submit_open_invitation_rsvp(text, text, text, text, integer, jsonb, text) to anon, authenticated;

notify pgrst, 'reload schema';
