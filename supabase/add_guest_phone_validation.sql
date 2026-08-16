-- Canonical guest phone validation for dashboard saves and CSV imports.
-- Run once in the Supabase SQL Editor, then refresh the PostgREST schema cache.
-- Existing rows are not rewritten. Valid phone values are normalized on their next write.

create or replace function public.normalize_guest_phone_e164(input_phone text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  cleaned text := btrim(coalesce(input_phone, ''));
  digits text;
  canonical text;
begin
  -- Spreadsheet-safe CSV exports may prefix a plus value with an apostrophe.
  cleaned := regexp_replace(cleaned, '^''+\s*', '');
  digits := regexp_replace(cleaned, '[^0-9]', '', 'g');

  if digits = '' then
    return null;
  end if;

  if cleaned ~ '^\s*00' then
    canonical := '+' || substring(digits from 3);
  elsif cleaned ~ '^\s*\+' then
    canonical := '+' || digits;
  elsif length(digits) = 10 and digits ~ '^[6-9][0-9]{9}$' then
    canonical := '+91' || digits;
  elsif length(digits) = 11 and digits ~ '^0[6-9][0-9]{9}$' then
    canonical := '+91' || substring(digits from 2);
  else
    canonical := '+' || digits;
  end if;

  if canonical !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Guest phone number is invalid. Use E.164 format or a 10-digit Indian mobile number.';
  end if;

  if canonical like '+91%' and canonical !~ '^\+91[6-9][0-9]{9}$' then
    raise exception 'Guest phone number is invalid. Indian mobile numbers must start with 6, 7, 8, or 9.';
  end if;

  if regexp_replace(canonical, '[^0-9]', '', 'g') ~ '^([0-9])\1+$' then
    raise exception 'Guest phone number is invalid.';
  end if;

  return canonical;
end;
$$;

create or replace function public.validate_and_normalize_guest_phone()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  normalized_phone text;
begin
  normalized_phone := public.normalize_guest_phone_e164(new.phone);

  if normalized_phone is null then
    -- Preserve legacy rows that already have no phone, but do not allow new missing
    -- phones or removal of a previously saved phone number.
    if tg_op = 'INSERT' then
      raise exception 'Guest phone number is required.';
    end if;
    if btrim(coalesce(old.phone, '')) <> '' then
      raise exception 'Guest phone number is required.';
    end if;
    return new;
  end if;

  new.phone := normalized_phone;
  return new;
end;
$$;

drop trigger if exists guests_validate_phone on public.guests;
create trigger guests_validate_phone
before insert or update of phone on public.guests
for each row execute function public.validate_and_normalize_guest_phone();

comment on function public.normalize_guest_phone_e164(text) is
  'Normalizes guest phone input to E.164-compatible text. Ten-digit local values default to India.';
comment on function public.validate_and_normalize_guest_phone() is
  'Validates and canonicalizes guests.phone for every write path.';

revoke all on function public.normalize_guest_phone_e164(text) from public;
revoke all on function public.validate_and_normalize_guest_phone() from public;
grant execute on function public.normalize_guest_phone_e164(text) to authenticated;

notify pgrst, 'reload schema';

-- Optional read-only audit after applying the migration:
-- select id, wedding_id, guest_name, phone
-- from public.guests
-- where phone is null or btrim(phone) = ''
--    or phone !~ '^\\+[1-9][0-9]{7,14}$'
--    or (phone like '+91%' and phone !~ '^\\+91[6-9][0-9]{9}$');
