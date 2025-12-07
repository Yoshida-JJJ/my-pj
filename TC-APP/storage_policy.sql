
-- Create a new storage bucket for card images
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do nothing;

-- Set up access policies for the storage bucket
-- 1. Allow public read access to the bucket
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'card-images' );

-- 2. Allow authenticated users to upload images
create policy "Authenticated users can upload images"
on storage.objects for insert
with check (
  bucket_id = 'card-images'
  and auth.role() = 'authenticated'
);

-- 3. Allow users to update/delete their own images (Optional but good practice)
create policy "Users can update own images"
on storage.objects for update
using (
  bucket_id = 'card-images'
  and auth.uid() = owner
);

create policy "Users can delete own images"
on storage.objects for delete
using (
  bucket_id = 'card-images'
  and auth.uid() = owner
);
