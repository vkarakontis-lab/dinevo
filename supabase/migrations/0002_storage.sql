-- ============================================================================
-- 0002_storage.sql — public photo bucket. Objects live at
--   <restaurant_id>/<slug>-NN-<width>.webp
-- so a member's write access can be checked from the first path segment.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restaurant-photos', 'restaurant-photos', true, 8388608, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true;

drop policy if exists "restaurant photos are public" on storage.objects;
create policy "restaurant photos are public" on storage.objects
  for select using (bucket_id = 'restaurant-photos');

-- Dashboard uploads: only members of the restaurant that owns the folder.
-- The add-restaurant script uses the service role and bypasses RLS entirely.
drop policy if exists "members manage their restaurant photos" on storage.objects;
create policy "members manage their restaurant photos" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'restaurant-photos'
    and is_restaurant_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'restaurant-photos'
    and is_restaurant_member(((storage.foldername(name))[1])::uuid)
  );
