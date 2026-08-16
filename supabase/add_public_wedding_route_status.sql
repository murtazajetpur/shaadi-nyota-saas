-- Distinguish a live wedding route from a reserved/private slug without
-- exposing wedding data, payment state, or ownership details to guests.

begin;

create or replace function public.get_public_wedding_route_status(wedding_slug text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when not exists (
      select 1
      from public.weddings as wedding
      where wedding.slug = btrim(coalesce(wedding_slug, ''))
    ) then 'not_found'
    when exists (
      select 1
      from public.weddings as wedding
      where wedding.slug = btrim(coalesce(wedding_slug, ''))
        and wedding.status = 'published'
        and wedding.payment_status = 'paid'
    ) then 'live'
    else 'not_live'
  end;
$$;

revoke all on function public.get_public_wedding_route_status(text) from public;
grant execute on function public.get_public_wedding_route_status(text) to anon, authenticated;

comment on function public.get_public_wedding_route_status(text) is
  'Returns live, not_live, or not_found for guest-facing route messaging without exposing wedding metadata.';

notify pgrst, 'reload schema';

commit;
