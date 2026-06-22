-- Migration RGPD Art. 9 — consentement données sensibles
-- Données sensibles concernées : orientation sexuelle, pratiques/désirs sexuels
-- Base légale : consentement explicite (Art. 9§2a RGPD)
-- Date : 2024-01-01 (à ajuster selon convention du projet)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS consent_given_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_version    TEXT;

-- Index pour les audits de conformité et rapports AIPD
CREATE INDEX IF NOT EXISTS profiles_consent_given_at_idx
  ON profiles (consent_given_at)
  WHERE consent_given_at IS NOT NULL;

-- Commentaires de documentation colonne
COMMENT ON COLUMN profiles.consent_given_at IS
  'Timestamp UTC du consentement explicite Art. 9 RGPD pour le traitement des données sensibles (orientation sexuelle, pratiques). NULL = pas encore consenti.';

COMMENT ON COLUMN profiles.consent_version IS
  'Version du texte de consentement accepté, ex: "v1.0". Permet de détecter les utilisateurs devant revalider après mise à jour du texte.';
