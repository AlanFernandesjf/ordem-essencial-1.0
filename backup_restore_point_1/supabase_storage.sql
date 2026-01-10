-- Create a public bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Set up access policies for the avatars bucket
-- 1. Public access to view images
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- 2. Authenticated users can upload images
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'avatars' );

-- 3. Users can update their own images (optional, depends on file naming strategy)
create policy "Users can update their own avatars"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text );

-- 4. Users can delete their own images
create policy "Users can delete their own avatars"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text );
