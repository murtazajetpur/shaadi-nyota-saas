-- Adds the reusable, wedding-scoped image library used by dashboard image pickers.
-- Run once in the Supabase SQL editor for existing projects.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-assets',
  'wedding-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.wedding_media (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  thumbnail_path text not null,
  thumbnail_url text not null,
  original_filename text not null default '',
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  thumbnail_size_bytes bigint not null default 0 check (thumbnail_size_bytes >= 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  initial_section text not null default 'shared' check (
    initial_section in ('opening-reveal', 'our-story', 'events', 'rsvp', 'closing-gallery', 'whatsapp', 'shared')
  ),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (wedding_id, storage_path)
);

create index if not exists wedding_media_wedding_created_idx
on public.wedding_media (wedding_id, created_at desc);

create or replace function public.enforce_wedding_media_limits()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_count integer;
  existing_bytes bigint;
begin
  if not exists (
    select 1
    from public.weddings
    where weddings.id = new.wedding_id
      and (weddings.owner_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'You cannot upload media for this wedding.' using errcode = '42501';
  end if;

  select count(*), coalesce(sum(size_bytes + thumbnail_size_bytes), 0)
  into existing_count, existing_bytes
  from public.wedding_media
  where wedding_id = new.wedding_id
    and (tg_op = 'INSERT' or id <> new.id);

  if existing_count >= 15 then
    raise exception 'Wedding media limit reached. Remove an unused image before uploading another.' using errcode = '22023';
  end if;

  if existing_bytes + new.size_bytes + new.thumbnail_size_bytes > 52428800 then
    raise exception 'Wedding media storage limit reached. Remove unused images before uploading another.' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists wedding_media_enforce_limits on public.wedding_media;
create trigger wedding_media_enforce_limits
before insert or update on public.wedding_media
for each row execute function public.enforce_wedding_media_limits();

alter table public.wedding_media enable row level security;

drop policy if exists "Couples and admins can read wedding media" on public.wedding_media;
create policy "Couples and admins can read wedding media"
on public.wedding_media
for select
to authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = wedding_media.wedding_id
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Couples and admins can add wedding media" on public.wedding_media;
create policy "Couples and admins can add wedding media"
on public.wedding_media
for insert
to authenticated
with check (
  exists (
    select 1 from public.weddings
    where weddings.id = wedding_media.wedding_id
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Couples and admins can delete wedding media" on public.wedding_media;
create policy "Couples and admins can delete wedding media"
on public.wedding_media
for delete
to authenticated
using (
  exists (
    select 1 from public.weddings
    where weddings.id = wedding_media.wedding_id
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

grant select, insert, delete on public.wedding_media to authenticated;
revoke all on public.wedding_media from anon;

-- Recreate the generic wedding-assets policies so every section can use the
-- same public bucket without exposing object metadata or bucket listing.
drop policy if exists "Users can read wedding assets" on storage.objects;
drop policy if exists "Couples and admins can read wedding asset metadata" on storage.objects;
drop policy if exists "Couples and admins can upload wedding assets" on storage.objects;
drop policy if exists "Couples and admins can update wedding assets" on storage.objects;
drop policy if exists "Couples and admins can delete wedding assets" on storage.objects;

create policy "Couples and admins can read wedding asset metadata"
on storage.objects for select to authenticated
using (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and exists (
    select 1 from public.weddings
    where weddings.id::text = (storage.foldername(name))[2]
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

create policy "Couples and admins can upload wedding assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and exists (
    select 1 from public.weddings
    where weddings.id::text = (storage.foldername(name))[2]
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

create policy "Couples and admins can update wedding assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and exists (
    select 1 from public.weddings
    where weddings.id::text = (storage.foldername(name))[2]
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
)
with check (
  bucket_id = 'wedding-assets'
  and (storage.foldername(name))[1] = 'weddings'
  and exists (
    select 1 from public.weddings
    where weddings.id::text = (storage.foldername(name))[2]
      and (weddings.owner_id = auth.uid() or public.is_admin())
  )
);

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
