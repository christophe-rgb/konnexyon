-- ============================================================
-- MIGRATION : Sécurisation des buckets storage
-- Corrige : policies manquantes sur avatars et chat-photos
-- ============================================================

-- ── 1. CRÉATION / MISE À JOUR DES BUCKETS ───────────────────
-- Buckets privés avec taille max et types MIME restreints.
-- "public = false" signifie que les objets ne sont PAS accessibles
-- via URL CDN sans authentification. On utilise des URLs signées côté code.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = false,
  file_size_limit    = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-photos',
  'chat-photos',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = false,
  file_size_limit    = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];


-- ── 2. SUPPRESSION DES POLICIES EXISTANTES (idempotence) ────

drop policy if exists "avatars_select_own"   on storage.objects;
drop policy if exists "avatars_insert_own"   on storage.objects;
drop policy if exists "avatars_update_own"   on storage.objects;
drop policy if exists "avatars_delete_own"   on storage.objects;
drop policy if exists "avatars_select_any_auth" on storage.objects;

drop policy if exists "chat_photos_select"   on storage.objects;
drop policy if exists "chat_photos_insert"   on storage.objects;
drop policy if exists "chat_photos_delete"   on storage.objects;


-- ── 3. POLICIES BUCKET "avatars" ────────────────────────────
-- Règle : un utilisateur peut lire TOUTES les avatars (profils visibles en découverte).
-- Il peut uploader/modifier/supprimer UNIQUEMENT dans son propre dossier {uid}/

-- Lecture : tout utilisateur authentifié peut voir les avatars
-- (nécessaire pour afficher les photos de profil dans Discover, Matches…)
create policy "avatars_select_any_auth"
  on storage.objects for select
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

-- Upload : uniquement dans son propre dossier {uid}/
create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Mise à jour (upsert) : uniquement son propre dossier
create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Suppression : uniquement son propre dossier
create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ── 4. POLICIES BUCKET "chat-photos" ────────────────────────
-- Règle : seuls les membres du match peuvent accéder aux photos.
-- Le path est {matchId}/{timestamp}.ext — on vérifie que l'utilisateur
-- appartient au match dont l'ID est le premier segment du path.

-- Lecture : uniquement si on est membre du match
create policy "chat_photos_select"
  on storage.objects for select
  using (
    bucket_id = 'chat-photos'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.matches m
      where m.id = (storage.foldername(name))[1]::uuid
        and (m.couple_a = auth.uid() or m.couple_b = auth.uid())
    )
  );

-- Upload : uniquement dans un match dont on est membre
create policy "chat_photos_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-photos'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.matches m
      where m.id = (storage.foldername(name))[1]::uuid
        and (m.couple_a = auth.uid() or m.couple_b = auth.uid())
    )
  );

-- Suppression : uniquement si on est membre du match
create policy "chat_photos_delete"
  on storage.objects for delete
  using (
    bucket_id = 'chat-photos'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.matches m
      where m.id = (storage.foldername(name))[1]::uuid
        and (m.couple_a = auth.uid() or m.couple_b = auth.uid())
    )
  );
