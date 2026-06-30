-- ============================================================
-- Finalisation durcissement (compléments d'audit)
-- ============================================================

-- 1) Supprimer la policy UPDATE permissive résiduelle sur messages.
-- 20260101000800 avait créé "Users can mark messages as read" (USING = simple
-- appartenance au match). 20260101001900 a recréé messages_update restreint au
-- propriétaire MAIS sans supprimer l'ancienne → les deux coexistaient en OR,
-- laissant un membre réécrire les messages de l'autre. On supprime la permissive.
drop policy if exists "Users can mark messages as read" on public.messages;

-- 2) Réparer le bannissement admin : la valeur d'enum 'banned' n'existait que
-- pour report_status, pas pour profile_status → admin_ban_profile échouait
-- (invalid input value for enum profile_status: "banned").
alter type public.profile_status add value if not exists 'banned';
