-- SEC-005 : Sécurisation des actions admin
-- Les mutations suspend/ban passent désormais par des RPC SECURITY DEFINER
-- qui vérifient le rôle 'admin' dans app_metadata côté PostgreSQL.
-- Les RLS sur reports bloquent tout accès direct non-admin.

-- ─── 1. RPC : suspendre un profil ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_suspend_profile(
  p_report_id   uuid,
  p_reported_id uuid,
  p_admin_note  text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérification rôle admin côté serveur
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' THEN
    RAISE EXCEPTION 'Accès refusé : rôle admin requis';
  END IF;

  UPDATE reports
  SET status       = 'suspended',
      admin_note   = p_admin_note,
      resolved_at  = now()
  WHERE id = p_report_id;

  UPDATE profiles
  SET status = 'suspended'
  WHERE id = p_reported_id;
END;
$$;

-- ─── 2. RPC : bannir un profil ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_ban_profile(
  p_report_id   uuid,
  p_reported_id uuid,
  p_admin_note  text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' THEN
    RAISE EXCEPTION 'Accès refusé : rôle admin requis';
  END IF;

  UPDATE profiles
  SET status = 'banned'
  WHERE id = p_reported_id;

  -- Résoudre tous les signalements pending de ce profil
  UPDATE reports
  SET status      = 'banned',
      admin_note  = p_admin_note,
      resolved_at = now()
  WHERE reported_id = p_reported_id
    AND status      = 'pending';

  -- Résoudre le signalement courant (peut déjà être couvert ci-dessus)
  UPDATE reports
  SET status      = 'banned',
      admin_note  = p_admin_note,
      resolved_at = now()
  WHERE id = p_report_id;
END;
$$;

-- ─── 3. RPC : résoudre un signalement (dismiss / warned) ────────────────────
CREATE OR REPLACE FUNCTION admin_resolve_report(
  p_report_id  uuid,
  p_status     text,   -- 'dismissed' | 'warned'
  p_admin_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' THEN
    RAISE EXCEPTION 'Accès refusé : rôle admin requis';
  END IF;

  IF p_status NOT IN ('dismissed', 'warned') THEN
    RAISE EXCEPTION 'Statut invalide : %', p_status;
  END IF;

  UPDATE reports
  SET status      = p_status,
      admin_note  = p_admin_note,
      resolved_at = now()
  WHERE id = p_report_id;
END;
$$;

-- ─── 4. RLS sur la table reports ─────────────────────────────────────────────
-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Supprimer les éventuelles politiques existantes sur reports pour éviter les conflits
DROP POLICY IF EXISTS admin_only_reports     ON reports;
DROP POLICY IF EXISTS reporter_insert        ON reports;
DROP POLICY IF EXISTS reporter_read_own      ON reports;

-- Seul un admin peut tout lire / modifier directement
CREATE POLICY admin_only_reports ON reports
  FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Un utilisateur authentifié peut créer un signalement
CREATE POLICY reporter_insert ON reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Un utilisateur peut lire ses propres signalements
CREATE POLICY reporter_read_own ON reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- ─── 5. Révoquer l'exécution publique des RPC (sécurité en profondeur) ───────
REVOKE EXECUTE ON FUNCTION admin_suspend_profile(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_ban_profile(uuid, uuid, text)     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_resolve_report(uuid, text, text)  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION admin_suspend_profile(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_ban_profile(uuid, uuid, text)     TO authenticated;
GRANT EXECUTE ON FUNCTION admin_resolve_report(uuid, text, text)  TO authenticated;
