-- ============================================================
-- Rate-limit sur INSERT likes
-- Approche : RLS avec sous-requête COUNT sur la fenêtre temporelle
--
-- Règle : max 50 connexions envoyées par heure et par utilisateur.
-- Logique : la policy WITH CHECK compte les likes du from_id
--   dans les 60 dernières minutes avant d'autoriser l'INSERT.
--
-- Avantages :
--   - Aucune infrastructure supplémentaire (pas d'Edge Function)
--   - Atomique côté base, impossible à contourner depuis le client
--   - Respecte la contrainte unique(from_id, to_id) déjà en place
--   - Compatible avec le trigger auto-match existant
--
-- Limite connue :
--   - Ajoute une sous-requête à chaque INSERT likes.
--   - Avec un index sur (from_id, created_at) déjà couvert par
--     likes_from_idx (from_id), on ajoute un index composite
--     ci-dessous pour rendre ce COUNT O(log n) plutôt que O(n).
-- ============================================================

-- 1. Index composite pour accélérer le COUNT sur la fenêtre glissante
create index if not exists likes_from_created_idx
  on public.likes (from_id, created_at desc);

-- 2. Remplacement de la policy likes_insert avec rate-limit
--    (DROP + CREATE plutôt qu'ALTER pour compatibilité Supabase CLI)
drop policy if exists "likes_insert" on public.likes;

create policy "likes_insert" on public.likes
  for insert
  with check (
    -- l'utilisateur ne peut insérer que ses propres connexions
    from_id = auth.uid()

    -- la cible n'est pas bloquée
    and not public.is_blocked(to_id)

    -- rate-limit : moins de 50 connexions envoyées dans la dernière heure
    and (
      select count(*)
      from public.likes
      where from_id = auth.uid()
        and created_at > now() - interval '1 hour'
    ) < 50
  );

-- ============================================================
-- VÉRIFICATION (commentée — à exécuter en console Supabase
-- pour contrôler que la policy est bien en place) :
--
-- select policyname, cmd, qual, with_check
-- from pg_policies
-- where tablename = 'likes' and policyname = 'likes_insert';
-- ============================================================
