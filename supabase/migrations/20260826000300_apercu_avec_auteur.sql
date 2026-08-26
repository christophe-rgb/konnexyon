-- ============================================================
-- L APERCU REND L IDENTIFIANT DE L AUTEUR
--
-- Le swipe d un visiteur ne doit pas etre perdu : s il ecarte ou
-- retient une ligne avant de s inscrire, ce geste doit valoir une fois
-- son compte cree. Il faut donc savoir a qui appartient chaque ligne.
--
-- On ne rend qu un identifiant opaque : sans compte, il ne permet
-- d atteindre ni le profil, ni l age, ni la ville, ni de joindre qui
-- que ce soit. Les policies restent la seule autorite.
-- ============================================================

drop function if exists public.get_apercu_du_jour(int);

create or replace function public.get_apercu_du_jour(p_limite int default 6)
returns table (mot text, ligne text, prenom text, auteur uuid)
language sql
stable
security definer
set search_path = public
as $$
  with today as (
    select w.id, w.word from public.daily_words w
    where w.publish_date <= current_date
    order by w.publish_date desc limit 1
  )
  select t.word, r.line, pr.display_name, pr.id
  from public.word_responses r
  join today t            on t.id  = r.daily_word_id
  join public.profiles pr on pr.id = r.user_id
  where pr.status = 'active'
    and pr.apercu_public
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limite, 6), 12));
$$;

grant execute on function public.get_apercu_du_jour(int) to anon, authenticated;

-- ============================================================
-- VALIDER LES SWIPES FAITS AVANT L INSCRIPTION
--
-- Le quota de trois connexions par jour continue de s appliquer : on
-- s arrete des qu il est atteint, sans faire echouer le reste. La
-- fonction rend le nombre de connexions reellement etablies, pour
-- pouvoir le dire honnetement au nouvel inscrit.
-- ============================================================

create or replace function public.valider_swipes(p_auteurs uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auteur uuid;
  v_faites int := 0;
begin
  if auth.uid() is null or p_auteurs is null then return 0; end if;

  foreach v_auteur in array p_auteurs loop
    exit when v_faites >= public.get_daily_connections_left();
    if v_auteur is null or v_auteur = auth.uid() then continue; end if;
    if public.is_blocked(v_auteur) then continue; end if;

    begin
      insert into public.likes (from_id, to_id) values (auth.uid(), v_auteur);
      v_faites := v_faites + 1;
    exception when unique_violation then
      continue;                       -- deja connecte, ce n est pas une erreur
    end;
  end loop;

  return v_faites;
end;
$$;

grant execute on function public.valider_swipes(uuid[]) to authenticated;
