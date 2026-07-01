-- ============================================================
-- Suppression de 2 bots du Cap d'Agde : Sophie & Lucas, Camille & Hugo
-- ============================================================
-- On retire aussi toutes leurs données liées (matchs, messages, likes,
-- blocks, reports) puis le profil et le compte auth. Julie & Marc reste.

do $$
declare
  botids uuid[] := array[
    '22222222-0002-0000-0000-000000000002'::uuid,  -- Sophie & Lucas
    '22222222-0003-0000-0000-000000000003'::uuid   -- Camille & Hugo
  ];
begin
  -- messages des conversations impliquant ces bots
  delete from public.messages where match_id in (
    select id from public.matches
    where couple_a = any(botids) or couple_b = any(botids)
  );
  -- matchs
  delete from public.matches where couple_a = any(botids) or couple_b = any(botids);
  -- likes envoyés / reçus
  delete from public.likes where from_id = any(botids) or to_id = any(botids);
  -- blocks
  delete from public.blocks where blocker_id = any(botids) or blocked_id = any(botids);
  -- signalements
  delete from public.reports where reporter_id = any(botids) or reported_id = any(botids);
  -- profils
  delete from public.profiles where id = any(botids);
  -- comptes auth
  delete from auth.users where id = any(botids);
end $$;
