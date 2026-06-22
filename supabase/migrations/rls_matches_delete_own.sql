-- SEC-004 : RLS DELETE sur matches — seuls couple_a ou couple_b peuvent supprimer leur match
-- Défense en profondeur complémentaire au filtre côté client dans useConversation.js

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delete own match" ON matches;

CREATE POLICY "delete own match"
  ON matches
  FOR DELETE
  USING (
    auth.uid() = couple_a
    OR auth.uid() = couple_b
  );
