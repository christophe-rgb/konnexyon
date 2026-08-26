-- ============================================================
-- L APERCU PUBLIC
--
-- Un visiteur doit voir ce qu est le site avant qu on lui demande de
-- s inscrire : le mot du jour et quelques lignes, a faire defiler.
--
-- C est une entorse assumee a la regle du site - on ne lit qu apres
-- avoir ecrit. Elle vaut pour les membres entre eux ; l apercu, lui,
-- ne montre qu une poignee de lignes, sans age, sans ville, sans
-- distance, et sans aucun moyen de joindre leur auteur.
--
-- profiles.apercu_public permet a chacun de s y soustraire.
-- ============================================================

alter table public.profiles
  add column if not exists apercu_public boolean not null default true;

comment on column public.profiles.apercu_public is
  'Autorise l affichage de ses lignes dans l apercu vu par les visiteurs non inscrits. Se regle dans les parametres.';

create or replace function public.get_apercu_du_jour(p_limite int default 6)
returns table (mot text, ligne text, prenom text)
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
  select t.word, r.line, pr.display_name
  from public.word_responses r
  join today t            on t.id  = r.daily_word_id
  join public.profiles pr on pr.id = r.user_id
  where pr.status = 'active'
    and pr.apercu_public
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limite, 6), 12));
$$;

-- accessible sans compte : c est tout l objet de l apercu
grant execute on function public.get_apercu_du_jour(int) to anon, authenticated;
