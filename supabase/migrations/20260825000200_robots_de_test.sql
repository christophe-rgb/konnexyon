-- ============================================================
-- DIX ROBOTS POUR FAIRE TOURNER LE SITE
--
-- Le site est techniquement pret et humainement vide : un seul compte,
-- aucune ligne, donc ni pile a swiper ni conversation a lire. Ces dix
-- profils servent a voir la boucle tourner.
--
-- Ils sont marques is_bot. Ce marqueur n'est pas decoratif : des faux
-- profils qui echangent avec de vrais membres sans etre signales, c'est
-- ce qui a valu des amendes aux sites de rencontre. Tant que le site
-- n'a qu'un compte reel, aucun risque ; le jour ou quelqu'un s'inscrit,
-- il faut pouvoir les reconnaitre et les retirer.
--
-- Pour les effacer, une seule commande :
--   delete from auth.users where email like '%@robot.konnexyon';
-- ============================================================

alter table public.profiles
  add column if not exists is_bot boolean not null default false;

comment on column public.profiles.is_bot is
  'Profil de test cree pour faire tourner le site. A retirer avant l ouverture aux inscriptions.';

do $$
declare
  v_moi        uuid;
  v_mot        uuid;
  v_id         uuid;
  v_robot      record;
  v_a          uuid;
  v_b          uuid;
begin
  -- le compte reel auquel tout le monde sera connecte
  select id into v_moi from auth.users where email = 'christopheparra@gmail.com';
  if v_moi is null then
    raise exception 'Compte principal introuvable : rien n a ete cree.';
  end if;

  -- le mot du jour, quel qu il soit
  select id into v_mot from public.daily_words
  where publish_date <= current_date order by publish_date desc limit 1;

  for v_robot in
    select * from (values
      ('Marion',   37, 'Lyon',          'Je pourrais passer une soiree entiere a parler avec quelqu un que je viens de rencontrer.',
                                        'Les conversations qui commencent par rien et finissent a trois heures du matin.',
                                        'Quel endroit pourrais-tu quitter demain sans regret ?',
                                        'Pas forcement quelqu un. Une conversation qui donne envie d en avoir une deuxieme.',
                                        'A trois heures, la maison respire sans moi.'),
      ('Theo',     41, 'Villeurbanne',  'Je dis rarement ce que je pense en premier. Ce qui vient apres est plus juste.',
                                        'Les gens qui posent une question et attendent vraiment la reponse.',
                                        'Qu est-ce que tu as arrete de faire, et qui te manque ?',
                                        'Quelqu un qui n a pas peur des silences au telephone.',
                                        'Le paillasson dit bienvenue a des gens qui ne viennent plus.'),
      ('Ines',     29, 'Lyon',          'On me trouve calme. C est surtout que je choisis mes phrases.',
                                        'Un livre ouvert sur la table, une fenetre, personne qui parle.',
                                        'Qu est-ce qui t a fait changer d avis recemment ?',
                                        'Une correspondance, au sens ancien du mot.',
                                        'J ai pose mes cles sur la table sans savoir si je repartais.'),
      ('Louise',   35, 'Ecully',        'Je ris trop fort, je m en excuse rarement.',
                                        'Les gens qui racontent mal une histoire mais la racontent quand meme.',
                                        'Quelle est la derniere chose que tu as apprise par coeur ?',
                                        'Quelqu un qui ne confond pas gentillesse et accord.',
                                        'Il faut deux courages : celui d entrer, et celui de rester.'),
      ('Gabriel',  44, 'Saint-Etienne', 'Je prends toujours le chemin le plus long. Ce n est pas de la lenteur.',
                                        'Le moment ou une conversation quitte le sujet pour de bon.',
                                        'Qu est-ce que tu ferais si personne ne l apprenait jamais ?',
                                        'Une presence qui ne demande pas a etre remplie.',
                                        'On repousse toujours la nuit d une heure, jamais de deux.'),
      ('Nour',     31, 'Villefranche',  'Je pose beaucoup de questions. C est ma facon de tenir la main.',
                                        'Les cuisines a une heure du matin, quand la fete est finie.',
                                        'Qu est-ce qui te met en colere et que tu n avoues pas ?',
                                        'Quelqu un a qui je pourrais dire je ne sais pas.',
                                        'Le sommeil est un pays dont j ai perdu la langue.'),
      ('Elias',    38, 'Lyon',          'J ai mis longtemps a comprendre que se taire n etait pas ecouter.',
                                        'Les repas qui durent parce que personne ne regarde l heure.',
                                        'Quel souvenir racontes-tu toujours de travers ?',
                                        'Une amitie qui deraperait, ou pas. On verra bien.',
                                        'A quatre heures, meme les regrets vont se coucher.'),
      ('Camille',  33, 'Oullins',       'Je suis d un enthousiasme fatigant, on me l a assez dit.',
                                        'Une idee neuve, meme si elle est fausse.',
                                        'De quoi es-tu certain, sans pouvoir l expliquer ?',
                                        'Quelqu un qui me contredit sans lever la voix.',
                                        'J ai compte les voitures jusqu a ce qu il n en passe plus.'),
      ('Sacha',    46, 'Vienne',        'Je crois aux gens sur parole. Ca m a coute, je continue.',
                                        'Les longues marches sans destination annoncee.',
                                        'Qu est-ce que tu emporterais si tu partais ce soir ?',
                                        'Une conversation qui n a pas besoin d objet.',
                                        'La nuit ne passe pas, c est nous qui la traversons.'),
      ('Jeanne',   27, 'Lyon',          'J ecris mieux que je ne parle, et ca ne me gene plus.',
                                        'Les gens qui gardent une trace de tout.',
                                        'Quelle phrase pourrait te faire changer d avis ?',
                                        'Quelqu un qui lit ce que j ecris jusqu au bout.',
                                        'Mon plafond connait mes projets mieux que moi.')
    ) as r(prenom, age, ville, r1, r2, r3, r4, ligne)
  loop
    v_id := gen_random_uuid();

    -- Compte sans mot de passe utilisable : ces profils ne se connectent pas,
    -- ils existent pour peupler le site.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      lower(v_robot.prenom) || '@robot.konnexyon',
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'
    );

    insert into public.profiles (id, display_name, age, city, email_1, email_1_confirmed, status, is_bot)
    values (v_id, v_robot.prenom, v_robot.age, v_robot.ville,
            lower(v_robot.prenom) || '@robot.konnexyon', true, 'active', true);

    -- les quatre reponses qui font le profil
    insert into public.profile_answers (user_id, slug, answer) values
      (v_id, 'phrase_pour_commencer', v_robot.r1),
      (v_id, 'ce_qui_me_fait_rester', v_robot.r2),
      (v_id, 'une_question',          v_robot.r3),
      (v_id, 'ce_que_je_cherche',     v_robot.r4);

    -- des gouts varies, pour que le taux de compatibilite ait du relief
    insert into public.profile_traits (user_id, traits)
    values (v_id, jsonb_build_object(
      'soiree',         1 + (abs(hashtext(v_robot.prenom || 'a')) % 5),
      'rythme',         1 + (abs(hashtext(v_robot.prenom || 'b')) % 5),
      'humour',         1 + (abs(hashtext(v_robot.prenom || 'c')) % 5),
      'reserve',        1 + (abs(hashtext(v_robot.prenom || 'd')) % 5),
      'lecture',        1 + (abs(hashtext(v_robot.prenom || 'e')) % 5),
      'musique',        1 + (abs(hashtext(v_robot.prenom || 'f')) % 5),
      'cinema',         1 + (abs(hashtext(v_robot.prenom || 'g')) % 5),
      'ailleurs',       1 + (abs(hashtext(v_robot.prenom || 'h')) % 5),
      'discuter',       1 + (abs(hashtext(v_robot.prenom || 'i')) % 5),
      'certitude',      1 + (abs(hashtext(v_robot.prenom || 'j')) % 5),
      'desordre',       1 + (abs(hashtext(v_robot.prenom || 'k')) % 5),
      'matiere',        1 + (abs(hashtext(v_robot.prenom || 'l')) % 5),
      'cherche_tempo',  1 + (abs(hashtext(v_robot.prenom || 'm')) % 5),
      'cherche_parole', 1 + (abs(hashtext(v_robot.prenom || 'n')) % 5),
      'cherche_accord', 1 + (abs(hashtext(v_robot.prenom || 'o')) % 5),
      'cherche_horizon',1 + (abs(hashtext(v_robot.prenom || 'p')) % 5)
    ));

    -- une ligne pour le mot du jour, sinon la pile reste vide
    if v_mot is not null then
      insert into public.word_responses (user_id, daily_word_id, line)
      values (v_id, v_mot, v_robot.ligne)
      on conflict do nothing;
    end if;

    -- connexion mutuelle avec le compte principal
    v_a := least(v_moi, v_id);
    v_b := greatest(v_moi, v_id);
    insert into public.matches (member_a, member_b, created_at)
    values (v_a, v_b, now() - interval '7 days')
    on conflict do nothing;

    -- Les likes des deux cotes, pour que l etat soit coherent.
    --
    -- Antidates d une semaine : le quota de trois connexions par jour
    -- compte les likes du jour, et dix connexions creees d un coup
    -- videraient la journee du compte principal avant qu il ait joue.
    insert into public.likes (from_id, to_id, created_at) values
      (v_moi, v_id, now() - interval '7 days'),
      (v_id, v_moi, now() - interval '7 days')
    on conflict do nothing;
  end loop;
end $$;

-- ============================================================
-- CONTROLE
-- ============================================================

select 'robots crees' as controle, count(*)::text as valeur from public.profiles where is_bot
union all select 'connexions avec toi', count(*)::text from public.matches
union all select 'lignes du jour',      count(*)::text from public.word_responses
union all select 'profils renseignes',  count(distinct user_id)::text from public.profile_answers
union all select 'comptes reels',       count(*)::text from public.profiles where not is_bot;
