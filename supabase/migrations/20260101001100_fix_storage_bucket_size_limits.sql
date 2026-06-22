-- STOR-004 : Enforce server-side file size limits on storage buckets
-- avatars  : 5 MB  (5 242 880 bytes)
-- chat-photos : 10 MB (10 485 760 bytes)
-- These limits are enforced by Supabase Storage before RLS policies run,
-- preventing client-side bypass of the JS validation in upload.js.

UPDATE storage.buckets
SET file_size_limit = 5242880
WHERE id = 'avatars';

UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'chat-photos';
