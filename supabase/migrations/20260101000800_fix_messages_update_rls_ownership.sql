-- SEC-001: markRead ownership fix
-- La politique UPDATE sur messages doit vérifier que l'utilisateur
-- est bien couple_a ou couple_b du match associé au message.

DROP POLICY IF EXISTS "Users can mark messages as read" ON messages;

CREATE POLICY "Users can mark messages as read"
ON messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = messages.match_id
      AND (matches.couple_a = auth.uid() OR matches.couple_b = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = messages.match_id
      AND (matches.couple_a = auth.uid() OR matches.couple_b = auth.uid())
  )
);
