-- ============================================================
-- Explorer : se déconnecter d'un couple (unmatch réel)
-- ============================================================
-- Retire la connexion réciproque (likes) + le match + la conversation.
-- On peut reconnecter ensuite (nouveau like).

create or replace function public.disconnect_couple(p_other_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); mid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_other_id is null then return; end if;

  -- likes réciproques
  delete from public.likes
   where (from_id = me and to_id = p_other_id)
      or (from_id = p_other_id and to_id = me);

  -- match (stocké couple_a/couple_b dans un ordre quelconque) + ses messages
  select id into mid from public.matches
   where (couple_a = me and couple_b = p_other_id)
      or (couple_a = p_other_id and couple_b = me)
   limit 1;
  if mid is not null then
    delete from public.messages where match_id = mid;
    delete from public.matches where id = mid;
  end if;
end;
$$;
grant execute on function public.disconnect_couple(uuid) to authenticated;
