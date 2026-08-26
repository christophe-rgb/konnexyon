-- Les robots ecrivaient sans accent : le seed avait ete ecrit en ASCII
-- pur pour survivre au collage. Sur un site d ecriture, ca ne va pas.
-- Les accents passent ici par des echappements Unicode, decodes par
-- Postgres lui-meme.

begin;

update public.word_responses set line = E'\u00C0 trois heures, la maison respire sans moi.'
  where user_id = (select id from public.profiles where display_name = 'Marion' and is_bot);
update public.word_responses set line = E'Le paillasson dit bienvenue \u00E0 des gens qui ne viennent plus.'
  where user_id = (select id from public.profiles where display_name = 'Theo' and is_bot);
update public.word_responses set line = E'J\u2019ai pos\u00E9 mes cl\u00E9s sur la table sans savoir si je repartais.'
  where user_id = (select id from public.profiles where display_name = 'Ines' and is_bot);
update public.word_responses set line = E'Il faut deux courages : celui d\u2019entrer, et celui de rester.'
  where user_id = (select id from public.profiles where display_name = 'Louise' and is_bot);
update public.word_responses set line = E'On repousse toujours la nuit d\u2019une heure, jamais de deux.'
  where user_id = (select id from public.profiles where display_name = 'Gabriel' and is_bot);
update public.word_responses set line = E'Le sommeil est un pays dont j\u2019ai perdu la langue.'
  where user_id = (select id from public.profiles where display_name = 'Nour' and is_bot);
update public.word_responses set line = E'\u00C0 quatre heures, m\u00EAme les regrets vont se coucher.'
  where user_id = (select id from public.profiles where display_name = 'Elias' and is_bot);
update public.word_responses set line = E'J\u2019ai compt\u00E9 les voitures jusqu\u2019\u00E0 ce qu\u2019il n\u2019en passe plus.'
  where user_id = (select id from public.profiles where display_name = 'Camille' and is_bot);
update public.word_responses set line = E'La nuit ne passe pas, c\u2019est nous qui la traversons.'
  where user_id = (select id from public.profiles where display_name = 'Sacha' and is_bot);
update public.word_responses set line = E'Mon plafond conna\u00EEt mes projets mieux que moi.'
  where user_id = (select id from public.profiles where display_name = 'Jeanne' and is_bot);
update public.profile_answers set answer = E'Je pourrais passer une soir\u00E9e enti\u00E8re \u00E0 parler avec quelqu\u2019un que je viens de rencontrer.'
  where slug = 'phrase_pour_commencer' and user_id = (select id from public.profiles where display_name = 'Marion' and is_bot);
update public.profile_answers set answer = E'Les conversations qui commencent par rien et finissent \u00E0 trois heures du matin.'
  where slug = 'ce_qui_me_fait_rester' and user_id = (select id from public.profiles where display_name = 'Marion' and is_bot);
update public.profile_answers set answer = E'Quel endroit pourrais-tu quitter demain sans regret ?'
  where slug = 'une_question' and user_id = (select id from public.profiles where display_name = 'Marion' and is_bot);
update public.profile_answers set answer = E'Pas forc\u00E9ment quelqu\u2019un. Une conversation qui donne envie d\u2019en avoir une deuxi\u00E8me.'
  where slug = 'ce_que_je_cherche' and user_id = (select id from public.profiles where display_name = 'Marion' and is_bot);
update public.profile_answers set answer = E'Je dis rarement ce que je pense en premier. Ce qui vient apr\u00E8s est plus juste.'
  where slug = 'phrase_pour_commencer' and user_id = (select id from public.profiles where display_name = 'Theo' and is_bot);
update public.profile_answers set answer = E'Les gens qui posent une question et attendent vraiment la r\u00E9ponse.'
  where slug = 'ce_qui_me_fait_rester' and user_id = (select id from public.profiles where display_name = 'Theo' and is_bot);
update public.profile_answers set answer = E'Qu\u2019est-ce que tu as arr\u00EAt\u00E9 de faire, et qui te manque ?'
  where slug = 'une_question' and user_id = (select id from public.profiles where display_name = 'Theo' and is_bot);
update public.profile_answers set answer = E'Quelqu\u2019un qui n\u2019a pas peur des silences au t\u00E9l\u00E9phone.'
  where slug = 'ce_que_je_cherche' and user_id = (select id from public.profiles where display_name = 'Theo' and is_bot);
update public.profile_answers set answer = E'On me trouve calme. C\u2019est surtout que je choisis mes phrases.'
  where slug = 'phrase_pour_commencer' and user_id = (select id from public.profiles where display_name = 'Ines' and is_bot);
update public.profile_answers set answer = E'Un livre ouvert sur la table, une fen\u00EAtre, personne qui parle.'
  where slug = 'ce_qui_me_fait_rester' and user_id = (select id from public.profiles where display_name = 'Ines' and is_bot);
update public.profile_answers set answer = E'Qu\u2019est-ce qui t\u2019a fait changer d\u2019avis r\u00E9cemment ?'
  where slug = 'une_question' and user_id = (select id from public.profiles where display_name = 'Ines' and is_bot);
update public.profile_answers set answer = E'Une correspondance, au sens ancien du mot.'
  where slug = 'ce_que_je_cherche' and user_id = (select id from public.profiles where display_name = 'Ines' and is_bot);
update public.profile_answers set answer = E'Je ris trop fort, je m\u2019en excuse rarement.'
  where slug = 'phrase_pour_commencer' and user_id = (select id from public.profiles where display_name = 'Louise' and is_bot);
update public.profile_answers set answer = E'Les gens qui racontent mal une histoire mais la racontent quand m\u00EAme.'
  where slug = 'ce_qui_me_fait_rester' and user_id = (select id from public.profiles where display_name = 'Louise' and is_bot);
update public.profile_answers set answer = E'Quelle est la derni\u00E8re chose que tu as apprise par c\u0153ur ?'
  where slug = 'une_question' and user_id = (select id from public.profiles where display_name = 'Louise' and is_bot);
update public.profile_answers set answer = E'Quelqu\u2019un qui ne confond pas gentillesse et accord.'
  where slug = 'ce_que_je_cherche' and user_id = (select id from public.profiles where display_name = 'Louise' and is_bot);
update public.profile_answers set answer = E'Je prends toujours le chemin le plus long. Ce n\u2019est pas de la lenteur.'
  where slug = 'phrase_pour_commencer' and user_id = (select id from public.profiles where display_name = 'Gabriel' and is_bot);
update public.profile_answers set answer = E'Le moment o\u00F9 une conversation quitte le sujet pour de bon.'
  where slug = 'ce_qui_me_fait_rester' and user_id = (select id from public.profiles where display_name = 'Gabriel' and is_bot);
update public.profile_answers set answer = E'Qu\u2019est-ce que tu ferais si personne ne l\u2019apprenait jamais ?'
  where slug = 'une_question' and user_id = (select id from public.profiles where display_name = 'Gabriel' and is_bot);
update public.profile_answers set answer = E'Une pr\u00E9sence qui ne demande pas \u00E0 \u00EAtre remplie.'
  where slug = 'ce_que_je_cherche' and user_id = (select id from public.profiles where display_name = 'Gabriel' and is_bot);
update public.profile_answers set answer = E'Je pose beaucoup de questions. C\u2019est ma fa\u00E7on de tenir la main.'
  where slug = 'phrase_pour_commencer' and user_id = (select id from public.profiles where display_name = 'Nour' and is_bot);
update public.profile_answers set answer = E'Les cuisines \u00E0 une heure du matin, quand la f\u00EAte est finie.'
  where slug = 'ce_qui_me_fait_rester' and user_id = (select id from public.profiles where display_name = 'Nour' and is_bot);
update public.profile_answers set answer = E'Qu\u2019est-ce qui te met en col\u00E8re et que tu n\u2019avoues pas ?'
  where slug = 'une_question' and user_id = (select id from public.profiles where display_name = 'Nour' and is_bot);
update public.profile_answers set answer = E'Quelqu\u2019un \u00E0 qui je pourrais dire \u00AB je ne sais pas \u00BB.'
  where slug = 'ce_que_je_cherche' and user_id = (select id from public.profiles where display_name = 'Nour' and is_bot);
update public.profile_answers set answer = E'J\u2019ai mis longtemps \u00E0 comprendre que se taire n\u2019\u00E9tait pas \u00E9couter.'
  where slug = 'phrase_pour_commencer' and user_id = (select id from public.profiles where display_name = 'Elias' and is_bot);
update public.profile_answers set answer = E'Les repas qui durent parce que personne ne regarde l\u2019heure.'
  where slug = 'ce_qui_me_fait_rester' and user_id = (select id from public.profiles where display_name = 'Elias' and is_bot);
update public.profile_answers set answer = E'Quel souvenir racontes-tu toujours de travers ?'
  where slug = 'une_question' and user_id = (select id from public.profiles where display_name = 'Elias' and is_bot);
update public.profile_answers set answer = E'Une amiti\u00E9 qui d\u00E9raperait, ou pas. On verra bien.'
  where slug = 'ce_que_je_cherche' and user_id = (select id from public.profiles where display_name = 'Elias' and is_bot);
update public.profile_answers set answer = E'Je suis d\u2019un enthousiasme fatigant, on me l\u2019a assez dit.'
  where slug = 'phrase_pour_commencer' and user_id = (select id from public.profiles where display_name = 'Camille' and is_bot);
update public.profile_answers set answer = E'Une id\u00E9e neuve, m\u00EAme si elle est fausse.'
  where slug = 'ce_qui_me_fait_rester' and user_id = (select id from public.profiles where display_name = 'Camille' and is_bot);
update public.profile_answers set answer = E'De quoi es-tu certain, sans pouvoir l\u2019expliquer ?'
  where slug = 'une_question' and user_id = (select id from public.profiles where display_name = 'Camille' and is_bot);
update public.profile_answers set answer = E'Quelqu\u2019un qui me contredit sans lever la voix.'
  where slug = 'ce_que_je_cherche' and user_id = (select id from public.profiles where display_name = 'Camille' and is_bot);
update public.profile_answers set answer = E'Je crois aux gens sur parole. \u00C7a m\u2019a co\u00FBt\u00E9, je continue.'
  where slug = 'phrase_pour_commencer' and user_id = (select id from public.profiles where display_name = 'Sacha' and is_bot);
update public.profile_answers set answer = E'Les longues marches sans destination annonc\u00E9e.'
  where slug = 'ce_qui_me_fait_rester' and user_id = (select id from public.profiles where display_name = 'Sacha' and is_bot);
update public.profile_answers set answer = E'Qu\u2019est-ce que tu emporterais si tu partais ce soir ?'
  where slug = 'une_question' and user_id = (select id from public.profiles where display_name = 'Sacha' and is_bot);
update public.profile_answers set answer = E'Une conversation qui n\u2019a pas besoin d\u2019objet.'
  where slug = 'ce_que_je_cherche' and user_id = (select id from public.profiles where display_name = 'Sacha' and is_bot);
update public.profile_answers set answer = E'J\u2019\u00E9cris mieux que je ne parle, et \u00E7a ne me g\u00EAne plus.'
  where slug = 'phrase_pour_commencer' and user_id = (select id from public.profiles where display_name = 'Jeanne' and is_bot);
update public.profile_answers set answer = E'Les gens qui gardent une trace de tout.'
  where slug = 'ce_qui_me_fait_rester' and user_id = (select id from public.profiles where display_name = 'Jeanne' and is_bot);
update public.profile_answers set answer = E'Quelle phrase pourrait te faire changer d\u2019avis ?'
  where slug = 'une_question' and user_id = (select id from public.profiles where display_name = 'Jeanne' and is_bot);
update public.profile_answers set answer = E'Quelqu\u2019un qui lit ce que j\u2019\u00E9cris jusqu\u2019au bout.'
  where slug = 'ce_que_je_cherche' and user_id = (select id from public.profiles where display_name = 'Jeanne' and is_bot);

-- Six robots redeviennent inconnus : sans eux la pile est vide, puisque
-- ce qui est deja connecte n y figure plus. Quatre gardent la connexion,
-- de quoi garnir Connexions et Messages.
delete from public.likes
where (from_id in (select id from public.profiles where is_bot and display_name not in ('Marion','Theo','Ines','Louise'))
    or to_id   in (select id from public.profiles where is_bot and display_name not in ('Marion','Theo','Ines','Louise')));

select 'robots connectes' as controle, count(*)::text as valeur from public.matches
union all select 'a swiper', count(*)::text from public.profiles p
  where p.is_bot and not exists (select 1 from public.likes l where l.to_id = p.id)
union all select 'lignes sans accent', count(*)::text from public.word_responses
  where line ~ '^[[:ascii:]]+$';

commit;
