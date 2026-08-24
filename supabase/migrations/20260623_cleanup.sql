-- ============================================================
-- CLEANUP — à coller dans Supabase SQL Editor (Run)
-- ============================================================

-- 1. Supprimer is_match_member (fonction inutilisée dans les policies RLS)
drop function if exists public.is_match_member(public.matches);

-- 2. Corriger profiles_select :
--    Bug actuel : status = 'active' bloque un utilisateur suspendu
--    qui ne peut plus lire son propre profil → app cassée.
--    Fix : own profile always accessible, status check only for others.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    auth.uid() is not null
    and not public.is_blocked(id)
    and (
      -- toujours voir son propre profil (même suspendu)
      id = auth.uid()
      or (
        status = 'active'
        and (
          visibility = 'public'
          or (
            visibility in ('matches_only', 'discreet')
            and exists (
              select 1 from public.matches
              where couple_a = least(auth.uid(), id)
                and couple_b = greatest(auth.uid(), id)
            )
          )
        )
      )
    )
  );

-- 3. Corriger messages_update :
--    Bug actuel : n'importe quel membre du match peut modifier
--    le contenu/photo d'un message qu'il n'a pas envoyé.
--    Fix : USING large (pour read_at), WITH CHECK restreint à l'expéditeur.
drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages
  for update
  using (
    -- accès lecture/update : membre du match (pour marquer read_at)
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.couple_a = auth.uid() or m.couple_b = auth.uid())
    )
  )
  with check (
    -- modification de contenu/photo : expéditeur uniquement
    sender_id = auth.uid()
    -- OU : mise à jour de read_at uniquement (content/photo inchangés)
    or exists (
      select 1 from public.messages orig
      where orig.id = id
        and orig.content is not distinct from content
        and orig.photo_url is not distinct from photo_url
    )
  );
