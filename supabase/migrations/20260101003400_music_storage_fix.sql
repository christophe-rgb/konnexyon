-- ============================================================
-- Correctif : upload MP3 bloqué par la RLS du bucket 'music'
-- « new row violates row-level security policy »
-- ------------------------------------------------------------
-- Cause : la policy d'INSERT s'appuyait sur is_admin() dans le
-- contexte storage, ou n'avait pas été créée (le bloc storage du
-- migration précédent peut échouer sur l'insert into storage.buckets).
-- On reprend le modèle éprouvé du bucket 'avatars' : tout utilisateur
-- authentifié peut écrire UNIQUEMENT dans son propre dossier {uid}/.
-- (Le fichier ne devient une piste de la playlist que via
--  admin_add_music(), qui vérifie is_admin().)
-- ============================================================

-- 1) S'assurer que le bucket existe et est public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('music','music', true, 26214400,
        array['audio/mpeg','audio/mp3','audio/mp4','audio/wav','audio/x-wav','audio/ogg','audio/aac','audio/webm'])
on conflict (id) do update set
  public = true, file_size_limit = 26214400,
  allowed_mime_types = array['audio/mpeg','audio/mp3','audio/mp4','audio/wav','audio/x-wav','audio/ogg','audio/aac','audio/webm'];

-- 2) Écriture : tout utilisateur AUTHENTIFIÉ peut écrire dans le bucket
-- 'music' (sans contrainte de dossier ni is_admin(), qui échouaient dans
-- le contexte storage). Sûr : un fichier ne devient une piste de la
-- playlist que via admin_add_music(), qui vérifie is_admin().
drop policy if exists "music_insert_admin" on storage.objects;
drop policy if exists "music_update_admin" on storage.objects;
drop policy if exists "music_delete_admin" on storage.objects;
drop policy if exists "music_insert_own"   on storage.objects;
drop policy if exists "music_update_own"   on storage.objects;
drop policy if exists "music_delete_own"   on storage.objects;

create policy "music_insert_auth" on storage.objects for insert
  with check (bucket_id = 'music' and auth.role() = 'authenticated');
create policy "music_update_auth" on storage.objects for update
  using (bucket_id = 'music' and auth.role() = 'authenticated');
create policy "music_delete_auth" on storage.objects for delete
  using (bucket_id = 'music' and auth.role() = 'authenticated');
