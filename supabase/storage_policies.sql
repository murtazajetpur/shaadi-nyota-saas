-- Reusable dashboard image uploads use the public `wedding-assets` bucket.
-- Create the bucket first in Supabase Storage:
--   bucket id: wedding-assets
--   public: true
--
-- Uploaded object path conventions:
--   weddings/{weddingId}/media/{mediaId}/image.webp
--   weddings/{weddingId}/media/{mediaId}/thumbnail.webp
--   weddings/{weddingId}/whatsapp-preview/{timestamp}-{filename}
--   weddings/{weddingId}/closing-gallery/{timestamp}-{filename}

drop policy if exists "Users can read wedding assets" on storage.objects;
create policy "Users can read wedding assets"
on storage.objects
for select
using (bucket_id = 'wedding-assets');

drop policy if exists "Couples and admins can upload wedding assets" on storage.objects;
create policy "Couples and admins can upload wedding assets"
on storage.objects
for insert
with check (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and exists (
    select 1
    from public.weddings
    where weddings.id = ((storage.foldername(name))[2])::uuid
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Couples and admins can update wedding assets" on storage.objects;
create policy "Couples and admins can update wedding assets"
on storage.objects
for update
using (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and exists (
    select 1
    from public.weddings
    where weddings.id = ((storage.foldername(name))[2])::uuid
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
)
with check (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and exists (
    select 1
    from public.weddings
    where weddings.id = ((storage.foldername(name))[2])::uuid
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Couples and admins can delete wedding assets" on storage.objects;
create policy "Couples and admins can delete wedding assets"
on storage.objects
for delete
using (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and exists (
    select 1
    from public.weddings
    where weddings.id = ((storage.foldername(name))[2])::uuid
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);
