-- One-time cleanup for removing test weddings while keeping the approved demo/live set.
--
-- Keeps only these wedding slugs:
-- - lubna-murtaza
-- - nick-priyanka
-- - sahil-ruhana
-- - mahesh-neha
--
-- Child rows in wedding_settings, events, guests, guest_event_invites, and
-- rsvp_responses are removed automatically through ON DELETE CASCADE.
-- This script does not delete Supabase Storage files. Uploaded files under
-- wedding-assets/weddings/{deletedWeddingId}/ can be cleaned separately after
-- confirming the database cleanup.

begin;

create temporary table cleanup_keep_wedding_slugs(slug text primary key) on commit drop;
insert into cleanup_keep_wedding_slugs(slug)
values
  ('lubna-murtaza'),
  ('nick-priyanka'),
  ('sahil-ruhana'),
  ('mahesh-neha');

-- Safety check: abort if any expected keep slug is missing. This prevents a typo
-- from silently deleting too much.
do $$
declare
  missing_slugs text;
begin
  select string_agg(keep.slug, ', ' order by keep.slug)
  into missing_slugs
  from cleanup_keep_wedding_slugs keep
  left join public.weddings weddings
    on weddings.slug = keep.slug
  where weddings.id is null;

  if missing_slugs is not null then
    raise exception 'Cleanup aborted. Missing keep wedding slug(s): %', missing_slugs;
  end if;
end $$;

-- Preview what will be removed in the SQL results before the delete result.
select
  weddings.id,
  weddings.slug,
  weddings.couple_display_name,
  weddings.status,
  weddings.payment_status,
  weddings.created_at
from public.weddings weddings
where not exists (
  select 1
  from cleanup_keep_wedding_slugs keep
  where keep.slug = weddings.slug
)
order by weddings.created_at desc;

with deleted_weddings as (
  delete from public.weddings weddings
  where not exists (
    select 1
    from cleanup_keep_wedding_slugs keep
    where keep.slug = weddings.slug
  )
  returning weddings.id, weddings.slug, weddings.couple_display_name
)
select
  count(*) as deleted_wedding_count,
  coalesce(jsonb_agg(to_jsonb(deleted_weddings) order by deleted_weddings.slug), '[]'::jsonb) as deleted_weddings
from deleted_weddings;

-- Final verification: should return only the four kept slugs.
select
  weddings.slug,
  weddings.couple_display_name,
  weddings.status,
  weddings.payment_status
from public.weddings weddings
order by weddings.slug;

commit;
