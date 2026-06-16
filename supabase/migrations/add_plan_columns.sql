-- Abonnement Premium
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Orientation détaillée (lui/elle)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS orientation_lui  TEXT DEFAULT 'hetero' CHECK (orientation_lui  IN ('hetero', 'bi')),
  ADD COLUMN IF NOT EXISTS orientation_elle TEXT DEFAULT 'hetero' CHECK (orientation_elle IN ('hetero', 'bi'));

CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);
