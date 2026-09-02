-- ============================================================
-- LA VITRINE NE DOIT JAMAIS ETRE VIDE, ET ELLE A DE QUOI MONTRER
--
-- Deux choses en un seul passage.
--
-- 1. get_apercu_du_jour ne regardait que le mot du jour. Tant que
--    personne n avait ecrit le matin meme, le visiteur tombait sur
--    "Vous avez lu toutes les lignes du jour" sans en avoir lu une
--    seule. La fenetre passe aux quatorze derniers mots, les plus
--    recents en tete : on voit d abord ce qui s ecrit aujourd hui, et
--    la pile se complete avec les jours d avant au lieu de s arreter.
--
-- 2. Trois lignes pour amorcer, sous trois profils marques is_bot. Le
--    marqueur n est pas decoratif : de faux profils qui echangent avec
--    de vrais membres sans etre signales, c est ce qui a valu des
--    amendes a des sites de rencontre. Ils restent reperables et
--    effacables d une seule commande, le jour ou de vraies phrases
--    prennent le relais :
--      delete from auth.users where email like '%@robot.konnexyon';
--
--    Ils ne sont connectes a personne, volontairement : la derniere
--    fois, dix connexions automatiques avaient vide la pile du compte
--    principal et mange son quota de la journee.
--
-- Le script est rejouable : un robot deja pose est saute.
-- ============================================================

begin;

-- ---- 1. la vitrine ---------------------------------------------

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

-- ---- 2. trois lignes pour amorcer ------------------------------

alter table public.profiles
  add column if not exists is_bot boolean not null default false;

comment on column public.profiles.is_bot is
  'Profil pose pour que la page ait de quoi se lire. A retirer des que de vraies phrases arrivent.';

do $$
declare
  v_mot   uuid;
  v_id    uuid;
  v_r     record;
  v_email text;
begin
  -- Les lignes ci-dessous repondent au mot "Vertige". On les accroche a
  -- lui, et non au mot du jour courant : sinon, passe minuit, trois
  -- phrases sur le vide se retrouveraient a repondre a tout autre chose.
  select id into v_mot from public.daily_words where word = E'Vertige' limit 1;
  if v_mot is null then
    select id into v_mot from public.daily_words
    where publish_date <= current_date order by publish_date desc limit 1;
  end if;
  if v_mot is null then
    raise exception 'Aucun mot en base : rien n a ete cree.';
  end if;

  for v_r in
    select * from (values
      (E'Camille', 34, E'Montpellier', E'Le vide ne m\u2019attire pas ; c\u2019est le bord qui me retient.', E'Je pose une question, puis je me tais assez longtemps pour qu\u2019on y r\u00E9ponde vraiment.', E'Les gens qui n\u2019ont pas peur d\u2019avoir tort \u00E0 voix haute.', E'Qu\u2019est-ce que tu regardes quand tu ne regardes rien ?', E'Une correspondance. Le mot au sens ancien, pas la bo\u00EEte de r\u00E9ception.'),
      (E'Samuel', 41, E'S\u00E8te', E'J\u2019ai compris trop tard que j\u2019avais le vertige des gens, pas des hauteurs.', E'Je parle lentement. Ce n\u2019est pas de la prudence, c\u2019est que je cherche le mot juste.', E'Une table, deux verres, et personne qui regarde l\u2019heure.', E'Qu\u2019est-ce que tu n\u2019as jamais racont\u00E9 correctement ?', E'Quelqu\u2019un qui \u00E9crit mieux qu\u2019il ne parle, et qui l\u2019assume.'),
      (E'Nour', 29, E'Montpellier', E'Deux secondes avant de sauter, on est encore quelqu\u2019un d\u2019autre.', E'Je ris trop fort et je m\u2019en excuse rarement.', E'Les phrases qu\u2019on relit deux fois sans savoir pourquoi.', E'Qu\u2019est-ce qui t\u2019a fait changer d\u2019avis, r\u00E9cemment ?', E'Une conversation qui donne envie d\u2019en avoir une deuxi\u00E8me.')
    ) as t(prenom, age, ville, ligne, r1, r2, r3, r4)
  loop
    v_email := lower(v_r.prenom) || '@robot.konnexyon';

    select id into v_id from auth.users where email = v_email;
    if v_id is not null then continue; end if;   -- deja pose

    v_id := gen_random_uuid();

    -- Compte sans mot de passe utilisable : ces profils ne se connectent
    -- pas, ils existent pour que la page ait quelque chose a montrer.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'
    );

    insert into public.profiles (id, display_name, age, city, email_1, email_1_confirmed, status, is_bot)
    values (v_id, v_r.prenom, v_r.age, v_r.ville, v_email, true, 'active', true);

    insert into public.profile_answers (user_id, slug, answer) values
      (v_id, 'phrase_pour_commencer', v_r.r1),
      (v_id, 'ce_qui_me_fait_rester', v_r.r2),
      (v_id, 'une_question',          v_r.r3),
      (v_id, 'ce_que_je_cherche',     v_r.r4);

    insert into public.profile_traits (user_id, traits)
    values (v_id, jsonb_build_object(
      'soiree',            1 + (abs(hashtext(v_r.prenom || 'a')) % 5),
      'rythme',            1 + (abs(hashtext(v_r.prenom || 'b')) % 5),
      'humour',            1 + (abs(hashtext(v_r.prenom || 'c')) % 5),
      'reserve',           1 + (abs(hashtext(v_r.prenom || 'd')) % 5),
      'lecture',           1 + (abs(hashtext(v_r.prenom || 'e')) % 5),
      'musique',           1 + (abs(hashtext(v_r.prenom || 'f')) % 5),
      'cinema',            1 + (abs(hashtext(v_r.prenom || 'g')) % 5),
      'ailleurs',          1 + (abs(hashtext(v_r.prenom || 'h')) % 5),
      'discuter',          1 + (abs(hashtext(v_r.prenom || 'i')) % 5),
      'certitude',         1 + (abs(hashtext(v_r.prenom || 'j')) % 5),
      'desordre',          1 + (abs(hashtext(v_r.prenom || 'k')) % 5),
      'matiere',           1 + (abs(hashtext(v_r.prenom || 'l')) % 5),
      'cherche_tempo',     1 + (abs(hashtext(v_r.prenom || 'm')) % 5),
      'cherche_parole',    1 + (abs(hashtext(v_r.prenom || 'n')) % 5),
      'cherche_accord',    1 + (abs(hashtext(v_r.prenom || 'o')) % 5),
      'cherche_horizon',   1 + (abs(hashtext(v_r.prenom || 'p')) % 5)
    ));

    insert into public.word_responses (user_id, daily_word_id, line)
    values (v_id, v_mot, v_r.ligne)
    on conflict do nothing;
  end loop;
end $$;

commit;

-- Controle : ce que verra reellement un visiteur.
select
  (select count(*) from public.word_responses)          as lignes_en_base,
  (select count(*) from public.profiles where is_bot)   as robots,
  (select count(*) from public.get_apercu_du_jour(6))   as lignes_en_vitrine;
