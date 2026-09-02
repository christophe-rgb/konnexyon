-- ============================================================
-- LA VITRINE NE DOIT JAMAIS ETRE VIDE
--
-- get_apercu_du_jour ne regardait que le mot du jour. Tant que
-- personne n avait ecrit le matin meme, le visiteur qui arrivait
-- sur konnexyon.com tombait sur "Vous avez lu toutes les lignes
-- du jour" sans en avoir lu une seule. Avec une poignee d inscrits,
-- c est l ecran d accueil la plupart des matins.
--
-- On elargit donc la fenetre aux quatorze derniers mots, en gardant
-- les plus recents en tete de pile : le visiteur voit d abord ce qui
-- s ecrit aujourd hui, et la pile se complete avec les jours d avant
-- plutot que de s arreter. Chaque carte porte deja son propre mot,
-- l affichage reste honnete.
-- ============================================================

begin;

create or replace function public.get_apercu_du_jour(p_limite int default 6)
returns table (mot text, ligne text, prenom text, auteur uuid)
language sql
stable
security definer
set search_path = public
as $$
  with fenetre as (
    select w.id, w.word, w.publish_date
    from public.daily_words w
    where w.publish_date <= current_date
    order by w.publish_date desc
    limit 14
  )
  select f.word, r.line, pr.display_name, pr.id
  from public.word_responses r
  join fenetre f          on f.id  = r.daily_word_id
  join public.profiles pr on pr.id = r.user_id
  where pr.status = 'active'
    and pr.apercu_public
  order by f.publish_date desc, r.created_at desc
  limit greatest(1, least(coalesce(p_limite, 6), 12));
$$;

grant execute on function public.get_apercu_du_jour(int) to anon, authenticated;

commit;

-- Controle : ce que verra reellement un visiteur.
select
  (select count(*) from public.word_responses)                as lignes_en_base,
  (select count(*) from public.get_apercu_du_jour(6))         as lignes_en_vitrine;
