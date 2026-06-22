-- ============================================================
-- FIX — messages.deleted_for NULL
-- ============================================================
-- Problème : la colonne `deleted_for uuid[]` n'avait pas de DEFAULT.
-- Les messages insérés sans cette colonne valent NULL. Le filtre PostgREST
-- `.not('deleted_for', 'cs', '{uid}')` (NOT contains) sur une valeur NULL
-- renvoie NULL → la ligne est exclue, donc des messages disparaissent
-- de la conversation alors qu'ils ne sont supprimés pour personne.
--
-- Solution : default '{}' + backfill des lignes existantes.
-- ============================================================

alter table public.messages
  alter column deleted_for set default '{}'::uuid[];

update public.messages
  set deleted_for = '{}'::uuid[]
  where deleted_for is null;
