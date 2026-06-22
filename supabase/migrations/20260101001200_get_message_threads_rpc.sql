-- RPC get_message_threads : remplace 1+2N requêtes par 1 seule requête
-- Utilisée par Messages.jsx pour charger tous les threads d'un coup.

CREATE OR REPLACE FUNCTION get_message_threads(p_profile_id uuid)
RETURNS TABLE (
  match_id    uuid,
  other_id    uuid,
  couple_name text,
  avatar_url  text,
  content     text,
  photo_url   text,
  created_at  timestamptz,
  sender_id   uuid,
  read_at     timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (m.id)
    m.id                                              AS match_id,
    CASE WHEN m.couple_a = p_profile_id THEN m.couple_b ELSE m.couple_a END AS other_id,
    p.couple_name,
    p.avatar_url,
    msg.content,
    msg.photo_url,
    msg.created_at,
    msg.sender_id,
    msg.read_at
  FROM matches m
  JOIN profiles p
    ON p.id = CASE WHEN m.couple_a = p_profile_id THEN m.couple_b ELSE m.couple_a END
  LEFT JOIN LATERAL (
    SELECT content, photo_url, created_at, sender_id, read_at
    FROM messages
    WHERE match_id = m.id
    ORDER BY created_at DESC
    LIMIT 1
  ) msg ON TRUE
  WHERE m.couple_a = p_profile_id OR m.couple_b = p_profile_id
  ORDER BY m.id, msg.created_at DESC NULLS LAST;
$$;

-- Accorder l'accès aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION get_message_threads(uuid) TO authenticated;
