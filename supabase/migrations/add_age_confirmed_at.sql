-- Migration : ajout de age_confirmed_at pour sécuriser la vérification d'âge côté serveur
-- Rend le bypass DevTools (localStorage) inefficace car la valeur Supabase écrase localStorage à chaque session.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_confirmed_at timestamptz DEFAULT NULL;

-- Index pour les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_profiles_age_confirmed_at
  ON public.profiles (age_confirmed_at);

-- Politique RLS : les profils non-confirmés ne peuvent pas lire les autres profils
-- (bloque le Discover si âge non confirmé côté base)
CREATE POLICY "profils visibles seulement si âge confirmé"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id  -- son propre profil toujours visible
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.age_confirmed_at IS NOT NULL
    )
  );
