begin;

-- Admin-only destructive operation. The wedding row is the cascade root for
-- settings, media metadata, events, guests, invite assignments, message
-- history, and RSVP responses.
create or replace function public.admin_delete_wedding(
  target_wedding_id uuid,
  confirmation_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_slug text;
  media_paths text[] := array[]::text[];
  settings_count integer := 0;
  media_count integer := 0;
  event_count integer := 0;
  guest_count integer := 0;
  invite_count integer := 0;
  message_count integer := 0;
  response_count integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only an administrator can delete a wedding.' using errcode = '42501';
  end if;

  select slug
  into target_slug
  from public.weddings
  where id = target_wedding_id
  for update;

  if target_slug is null then
    raise exception 'Wedding not found.' using errcode = 'P0002';
  end if;

  if confirmation_slug is null or btrim(confirmation_slug) <> target_slug then
    raise exception 'The confirmation slug does not match this wedding.' using errcode = '22023';
  end if;

  select coalesce(array_agg(path order by path), array[]::text[])
  into media_paths
  from (
    select storage_path as path
    from public.wedding_media
    where wedding_id = target_wedding_id
    union all
    select thumbnail_path as path
    from public.wedding_media
    where wedding_id = target_wedding_id
  ) paths
  where path is not null and btrim(path) <> '';

  select count(*) into settings_count from public.wedding_settings where wedding_id = target_wedding_id;
  select count(*) into media_count from public.wedding_media where wedding_id = target_wedding_id;
  select count(*) into event_count from public.events where wedding_id = target_wedding_id;
  select count(*) into guest_count from public.guests where wedding_id = target_wedding_id;
  select count(*) into invite_count from public.guest_event_invites where wedding_id = target_wedding_id;
  select count(*) into message_count from public.guest_message_history where wedding_id = target_wedding_id;
  select count(*) into response_count from public.rsvp_responses where wedding_id = target_wedding_id;

  delete from public.weddings where id = target_wedding_id;

  if not found then
    raise exception 'Wedding could not be deleted.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'success', true,
    'slug', target_slug,
    'storage_paths', to_jsonb(media_paths),
    'deleted_counts', jsonb_build_object(
      'settings', settings_count,
      'media', media_count,
      'events', event_count,
      'guests', guest_count,
      'guest_event_invites', invite_count,
      'guest_message_history', message_count,
      'rsvp_responses', response_count
    )
  );
end;
$$;

revoke all on function public.admin_delete_wedding(uuid, text) from public, anon;
grant execute on function public.admin_delete_wedding(uuid, text) to authenticated;

-- The wedding row is deleted before binary cleanup. Permit administrators to
-- remove the exact returned object paths even after that row no longer exists.
drop policy if exists "Couples and admins can delete wedding assets" on storage.objects;
create policy "Couples and admins can delete wedding assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.weddings
      where weddings.id::text = (storage.foldername(name))[2]
        and weddings.owner_id = auth.uid()
    )
  )
);

notify pgrst, 'reload schema';

commit;
