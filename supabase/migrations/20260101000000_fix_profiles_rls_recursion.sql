-- Fix : infinite recursion detected in policy for relation "profiles"
--
-- Cause : lors d'un upsert, PostgreSQL évalue la politique profiles_select
-- (via RETURNING *) en même temps que la politique d'UPDATE, créant une
-- boucle de réévaluation. La solution canonique est de déplacer toute
-- la logique dans une fonction SECURITY DEFINER qui court-circuite RLS.

-- 1. Fonction qui centralise la logique de visibilité (bypasse RLS)
CREATE OR REPLACE FUNCTION public.profile_is_visible(
  p_id         uuid,
  p_status     text,
  p_visibility text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND p_status = 'active'
    -- pas de blocage mutuel (déjà security definer via is_blocked)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = p_id)
         OR (blocker_id = p_id       AND blocked_id = auth.uid())
    )
    AND (
      -- toujours voir son propre profil
      p_id = auth.uid()
      -- profil public
      OR p_visibility = 'public'
      -- profil matches_only : uniquement si on est matchés
      OR (
        p_visibility = 'matches_only'
        AND EXISTS (
          SELECT 1 FROM public.matches
          WHERE couple_a = LEAST(auth.uid(), p_id)
            AND couple_b = GREATEST(auth.uid(), p_id)
        )
      )
    );
$$;

-- 2. Remplacer la politique récursive par une version simple via la fonction
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT
  USING (public.profile_is_visible(id, status::text, visibility::text));
