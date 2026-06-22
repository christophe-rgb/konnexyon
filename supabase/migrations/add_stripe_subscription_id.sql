-- Migration: stockage du stripe_subscription_id pour permettre la résiliation directe
-- Obligatoire pour conformité loi Chatel / art. L.215-1 Code de la consommation
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_sub ON profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
