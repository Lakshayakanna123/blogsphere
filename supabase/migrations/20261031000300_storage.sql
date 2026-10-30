-- =============================================================================
-- BlogSphere — 0003: Supabase Storage bucket + policies
--
-- Bucket "post-images" is PUBLIC: it only stores assets intended for
-- publication (cover images, inline article images, avatars). Public READ
-- happens through the public CDN URL; WRITE access is restricted by the
-- policies below to the caller's own top-level folder:
--
--     post-images/{auth.uid()}/{uuid}.{jpg|png|webp}
--
-- Bucket-level limits (size + MIME allow-list) are enforced by Storage.
-- The app additionally sniffs magic bytes server-side before uploading.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  4194304, -- 4 MiB (stays under Vercel's 4.5 MB request body limit)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Authenticated users may upload only into their own folder, only images.
create policy "post-images: owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- Owners may list/read their own objects through the API (needed for
-- management). Public delivery uses the public URL and needs no policy,
-- so other users' folders cannot be enumerated.
create policy "post-images: owner select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Owners may replace only their own objects.
create policy "post-images: owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- Owners may delete only their own objects.
create policy "post-images: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
