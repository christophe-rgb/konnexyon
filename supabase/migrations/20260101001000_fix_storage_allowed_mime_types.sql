-- STOR-006 : configure allowed_mime_types sur les buckets avatars et chat-photos
-- Supabase Storage applique cette contrainte avant les policies RLS,
-- ce qui empêche l'upload de fichiers non-image même renommés en .jpg.

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where name in ('avatars', 'chat-photos');
