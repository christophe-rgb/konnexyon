-- RGPD Art. 9 — allow nulling sensitive fields on consent revocation
-- orientation and seeking must be nullable so users can revoke consent at any time.
ALTER TABLE profiles
  ALTER COLUMN consent_given_at DROP NOT NULL,
  ALTER COLUMN orientation      DROP NOT NULL,
  ALTER COLUMN seeking          DROP NOT NULL;
