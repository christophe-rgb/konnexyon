-- ============================================================
-- Admin : vider / supprimer une conversation de bot
-- ============================================================

-- Vider : efface tous les messages du match (la connexion reste).
create or replace function public.admin_reset_bot_thread(p_match_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if not exists (
    select 1 from public.matches m
    join public.profiles p on (p.id = m.couple_a or p.id = m.couple_b)
    where m.id = p_match_id and p.is_bot
  ) then raise exception 'pas un match de bot'; end if;
  delete from public.messages where match_id = p_match_id;
end;
$$;
grant execute on function public.admin_reset_bot_thread(uuid) to authenticated;

-- Supprimer : efface messages + match + likes (repart de zéro, un nouveau
-- like du client pourra recréer une conversation propre).
create or replace function public.admin_delete_bot_thread(p_match_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select m.couple_a, m.couple_b into a, b
  from public.matches m
  where m.id = p_match_id
    and exists (
      select 1 from public.profiles p
      where (p.id = m.couple_a or p.id = m.couple_b) and p.is_bot
    );
  if a is null then raise exception 'pas un match de bot'; end if;
  delete from public.messages where match_id = p_match_id;
  delete from public.matches  where id = p_match_id;
  delete from public.likes
   where (from_id = a and to_id = b) or (from_id = b and to_id = a);
end;
$$;
grant execute on function public.admin_delete_bot_thread(uuid) to authenticated;
