-- Shaadi Nyota production security hotfix verification.
--
-- Run this in the Supabase SQL Editor after production_security_hotfix.sql.
-- This file is read-only. The first result set must contain only PASS rows.
-- The final detail queries must both return zero rows.

with required_rls_tables(table_name) as (
  values
    ('profiles'),
    ('themes'),
    ('reveal_variations'),
    ('music_options'),
    ('weddings'),
    ('wedding_settings'),
    ('wedding_media'),
    ('events'),
    ('guests'),
    ('guest_event_invites'),
    ('guest_message_history'),
    ('rsvp_responses')
),
checks as (
  select
    10 as sort_order,
    'RLS is enabled on every application table' as check_name,
    not exists (
      select 1
      from required_rls_tables required
      where not exists (
        select 1
        from pg_class table_class
        join pg_namespace table_schema
          on table_schema.oid = table_class.relnamespace
        where table_schema.nspname = 'public'
          and table_class.relname = required.table_name
          and table_class.relkind in ('r', 'p')
          and table_class.relrowsecurity is true
      )
    ) as passed,
    'All listed public tables must have relrowsecurity enabled.' as expected

  union all

  select
    15,
    'Browser roles cannot create objects in the public schema',
    not has_schema_privilege('anon', 'public', 'CREATE')
    and not has_schema_privilege('authenticated', 'public', 'CREATE'),
    'Only trusted database roles may create objects in the public schema.'

  union all

  select
    20,
    'Authenticated users cannot update profiles.role',
    not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
    'Role changes are restricted to trusted backend or SQL sessions.'

  union all

  select
    30,
    'Profile role protection trigger is enabled',
    exists (
      select 1
      from pg_trigger trigger_row
      join pg_class table_class on table_class.oid = trigger_row.tgrelid
      join pg_namespace table_schema on table_schema.oid = table_class.relnamespace
      where table_schema.nspname = 'public'
        and table_class.relname = 'profiles'
        and trigger_row.tgname = 'profiles_protect_role'
        and trigger_row.tgenabled <> 'D'
        and not trigger_row.tgisinternal
    ),
    'profiles_protect_role must exist and be enabled.'

  union all

  select
    40,
    'Anonymous users have no direct private guest-table privileges',
    not exists (
      select 1
      from (
        values
          ('public.guests'),
          ('public.guest_event_invites'),
          ('public.guest_message_history'),
          ('public.rsvp_responses')
      ) as private_table(table_name)
      where has_table_privilege(
        'anon',
        private_table.table_name,
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
      )
    ),
    'Personalized invite and RSVP access must use validated RPCs only.'

  union all

  select
    50,
    'No public or anonymous RLS policies expose private guest data',
    not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename in (
          'guests',
          'guest_event_invites',
          'guest_message_history',
          'rsvp_responses'
        )
        and (
          policyname ilike 'public%'
          or roles && array['anon'::name, 'public'::name]
        )
    ),
    'Private guest data must not have public or anon policies.'

  union all

  select
    60,
    'Authenticated users have no dangerous table-level privileges',
    not exists (
      select 1
      from (
        values
          ('public.profiles'),
          ('public.themes'),
          ('public.reveal_variations'),
          ('public.music_options'),
          ('public.weddings'),
          ('public.wedding_settings'),
          ('public.wedding_media'),
          ('public.events'),
          ('public.guests'),
          ('public.guest_event_invites'),
          ('public.guest_message_history'),
          ('public.rsvp_responses')
      ) as app_table(table_name)
      where has_table_privilege(
        'authenticated',
        app_table.table_name,
        'TRUNCATE,REFERENCES,TRIGGER'
      )
    ),
    'TRUNCATE, REFERENCES, and TRIGGER must not be granted to authenticated.'

  union all

  select
    70,
    'Catalog tables are read-only for browser roles',
    not exists (
      select 1
      from (
        values
          ('public.themes'),
          ('public.reveal_variations'),
          ('public.music_options')
      ) as catalog_table(table_name)
      cross join (
        values ('anon'), ('authenticated')
      ) as browser_role(role_name)
      where not has_table_privilege(
              browser_role.role_name,
              catalog_table.table_name,
              'SELECT'
            )
         or has_table_privilege(
              browser_role.role_name,
              catalog_table.table_name,
              'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
            )
    ),
    'anon and authenticated may SELECT active catalog rows but may not write them.'

  union all

  select
    80,
    'Personalized invite RPC is SECURITY DEFINER',
    exists (
      select 1
      from pg_proc function_row
      where function_row.oid = to_regprocedure('public.get_public_invite_by_code(text,text)')
        and function_row.prosecdef
        and coalesce(array_to_string(function_row.proconfig, ','), '') ilike '%search_path=%'
    ),
    'get_public_invite_by_code(text,text) must be SECURITY DEFINER with search_path set.'

  union all

  select
    90,
    'Public RSVP RPC is SECURITY DEFINER',
    exists (
      select 1
      from pg_proc function_row
      where function_row.oid = to_regprocedure('public.submit_guest_rsvp(text,text,jsonb,text)')
        and function_row.prosecdef
        and coalesce(array_to_string(function_row.proconfig, ','), '') ilike '%search_path=%'
    ),
    'submit_guest_rsvp(text,text,jsonb,text) must be SECURITY DEFINER with search_path set.'

  union all

  select
    100,
    'Anonymous users can execute the validated public invite RPCs',
    has_function_privilege(
      'anon',
      'public.get_public_invite_by_code(text,text)',
      'EXECUTE'
    )
    and has_function_privilege(
      'anon',
      'public.submit_guest_rsvp(text,text,jsonb,text)',
      'EXECUTE'
    ),
    'Both invite-code validated RPCs must remain executable by anon.'

  union all

  select
    110,
    'Storage metadata listing is restricted to authenticated owners/admins',
    exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'Couples and admins can read wedding asset metadata'
        and cmd = 'SELECT'
        and roles = array['authenticated'::name]
        and qual ilike '%wedding-assets%'
        and qual ilike '%owner_id%'
        and qual ilike '%is_admin%'
    )
    and not exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and cmd = 'SELECT'
        and (
          roles && array['anon'::name, 'public'::name]
          or policyname = 'Users can read wedding assets'
        )
    ),
    'Exact public bucket URLs remain usable, but object metadata/listing is authenticated and wedding-scoped.'

  union all

  select
    115,
    'Storage mutations are restricted to authenticated owners/admins',
    (
      select count(*)
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname in (
          'Couples and admins can upload wedding assets',
          'Couples and admins can update wedding assets',
          'Couples and admins can delete wedding assets'
        )
        and cmd in ('INSERT', 'UPDATE', 'DELETE')
        and roles = array['authenticated'::name]
        and coalesce(qual, with_check) ilike '%wedding-assets%'
        and coalesce(qual, with_check) ilike '%owner_id%'
        and coalesce(qual, with_check) ilike '%is_admin%'
    ) = 3,
    'INSERT, UPDATE, and DELETE policies must all be authenticated and wedding-scoped.'

  union all

  select
    120,
    'Event ownership policies are consolidated',
    (
      select count(*)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'events'
        and policyname in (
          'Couples can manage own events',
          'Admins can manage all events'
        )
        and cmd = 'ALL'
    ) = 2
    and not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'events'
        and policyname ~ '^(Couples|Admins) can (read|insert|update|delete)'
    ),
    'Keep the two canonical ALL policies instead of overlapping CRUD policies.'

  union all

  select
    130,
    'Guest ownership policies are consolidated',
    (
      select count(*)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'guests'
        and policyname in (
          'Couples can manage own guests',
          'Admins can manage all guests'
        )
        and cmd = 'ALL'
    ) = 2
    and (
      select count(*)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'guest_event_invites'
        and policyname in (
          'Couples can manage own guest event invites',
          'Admins can manage all guest event invites'
        )
        and cmd = 'ALL'
    ) = 2
    and not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename in ('guests', 'guest_event_invites')
        and policyname ~ '^(Couples|Admins) can (read|insert|update|delete)'
    ),
    'Guest and invite ownership must use the canonical owner/admin policies.'
)
select
  case when passed then 'PASS' else 'FAIL' end as status,
  check_name,
  expected
from checks
order by sort_order;

-- Expected result: zero rows.
select
  grantee,
  table_schema,
  table_name,
  privilege_type
from information_schema.role_table_grants
where grantee in ('PUBLIC', 'anon', 'authenticated')
  and table_schema = 'public'
  and table_name in (
    'profiles',
    'themes',
    'reveal_variations',
    'music_options',
    'weddings',
    'wedding_settings',
    'wedding_media',
    'events',
    'guests',
    'guest_event_invites',
    'guest_message_history',
    'rsvp_responses'
  )
  and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
order by grantee, table_name, privilege_type;

-- Expected result: zero rows.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'guests',
    'guest_event_invites',
    'guest_message_history',
    'rsvp_responses'
  )
  and (
    policyname ilike 'public%'
    or roles && array['anon'::name, 'public'::name]
  )
order by tablename, policyname;
