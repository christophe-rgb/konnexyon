-- ============================================================
-- KONNEXYON - BASCULE VERS LE SITE DE RENCONTRE PAR L'ECRITURE
--
-- Les sept migrations reunies dans l'ordre, en une seule transaction :
-- le DDL est transactionnel en Postgres, donc si la moindre instruction
-- echoue, RIEN n'est applique.
--
-- Fichier volontairement en ASCII pur : les accents des chaines sont
-- ecrits en echappements Unicode (E'Mar\u00E9e'), que Postgres decode
-- lui-meme. Le trajet jusqu'a l'editeur SQL ne peut donc rien corrompre.
--
-- Tout ce qui disparait est d'abord recopie dans
-- public.archive_profils_couple, dans cette meme transaction.
-- ============================================================

begin;

-- ----------------------------------------------------------
-- | 20260823000000_daily_words.sql
-- ----------------------------------------------------------

-- ============================================================
-- MOT DU JOUR
--   - daily_words    : un mot publie par jour
--   - word_responses : la ligne que chaque membre ecrit en reaction
--
-- Aucune migration existante n'est modifiee. La seule policy reprise
-- est likes_insert, pour y ajouter le quota 3/jour (DROP + CREATE,
-- comme dans 20260101001300_rate_limit_likes.sql).
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.daily_words (
  id            uuid primary key default uuid_generate_v4(),
  word          text not null check (char_length(word) between 1 and 40),
  publish_date  date not null unique,
  created_at    timestamptz not null default now()
);

create index if not exists daily_words_publish_date_idx
  on public.daily_words (publish_date desc);

create table if not exists public.word_responses (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id)    on delete cascade,
  daily_word_id  uuid not null references public.daily_words(id) on delete cascade,
  line           text not null check (char_length(line) between 1 and 180),
  created_at     timestamptz not null default now(),

  -- une seule ligne par membre et par mot
  unique (user_id, daily_word_id)
);

-- lecture des lignes du jour (pile de swipe)
create index if not exists word_responses_word_idx
  on public.word_responses (daily_word_id, created_at desc);

-- lecture de " Mon carnet " (anti-chronologique)
create index if not exists word_responses_user_idx
  on public.word_responses (user_id, created_at desc);

-- ============================================================
-- HELPERS (security definer)
-- ============================================================

-- Ai-je deja ecrit ma ligne pour ce mot ?
--
-- Indispensable en security definer : appelee depuis la policy SELECT de
-- word_responses, une sous-requete directe sur word_responses ferait
-- recursion infinie. Meme contournement que public.is_blocked().
drop function if exists public.has_answered(uuid);

create or replace function public.has_answered(p_word_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.word_responses
    where user_id = auth.uid()
      and daily_word_id = p_word_id
  );
$$;

-- Le mot du jour. Prend le plus recent deja publie plutot qu'une egalite
-- stricte sur current_date : un trou dans le calendrier ne casse pas
-- l'ecran, il prolonge simplement le mot de la veille.
drop function if exists public.get_word_of_the_day();

create or replace function public.get_word_of_the_day()
returns table (id uuid, word text, publish_date date)
language sql
security definer
set search_path = public
as $$
  select w.id, w.word, w.publish_date
  from public.daily_words w
  where w.publish_date <= current_date
  order by w.publish_date desc
  limit 1;
$$;

-- Connexions restantes aujourd'hui (quota 3/jour).
-- Journee calee sur Europe/Paris : le compteur se remet a zero a minuit
-- heure francaise, pas a 2h du matin comme le ferait un date_trunc UTC.
drop function if exists public.get_daily_connections_left();

create or replace function public.get_daily_connections_left()
returns integer
language sql
security definer
set search_path = public
as $$
  select greatest(0, 3 - (
    select count(*)::int
    from public.likes
    where from_id = auth.uid()
      and (created_at at time zone 'Europe/Paris')
          >= date_trunc('day', (now() at time zone 'Europe/Paris'))
  ));
$$;

-- Les lignes des autres pour le mot du jour.
--
-- En security definer pour ne pas dependre de la policy SELECT de profiles :
-- un membre en visibilite 'discreet' verrait sinon sa ligne disparaitre de
-- la pile faute de pouvoir lire son couple_name. Les exclusions (soi-meme,
-- bloques, deja connectes) restent appliquees ici explicitement.
drop function if exists public.get_today_responses();

create or replace function public.get_today_responses()
returns table (
  id          uuid,
  user_id     uuid,
  pseudo      text,
  line        text,
  created_at  timestamptz
)
language sql
security definer
set search_path = public
as $$
  with today as (
    select w.id
    from public.daily_words w
    where w.publish_date <= current_date
    order by w.publish_date desc
    limit 1
  )
  select r.id, r.user_id, pr.couple_name as pseudo, r.line, r.created_at
  from public.word_responses r
  join today t            on t.id  = r.daily_word_id
  join public.profiles pr on pr.id = r.user_id
  where auth.uid() is not null
    -- on ne decouvre les lignes des autres qu'apres avoir ecrit la sienne
    and public.has_answered(t.id)
    and r.user_id <> auth.uid()
    and pr.status = 'active'
    and not public.is_blocked(r.user_id)
    -- deja connecte : on ne le repropose pas
    and not exists (
      select 1 from public.likes l
      where l.from_id = auth.uid() and l.to_id = r.user_id
    )
  order by r.created_at desc;
$$;

-- Mon carnet : mes lignes, chacune avec son mot, anti-chronologique.
drop function if exists public.get_my_carnet();

create or replace function public.get_my_carnet()
returns table (
  id            uuid,
  line          text,
  word          text,
  publish_date  date,
  created_at    timestamptz
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.line, w.word, w.publish_date, r.created_at
  from public.word_responses r
  join public.daily_words w on w.id = r.daily_word_id
  where r.user_id = auth.uid()
  order by w.publish_date desc, r.created_at desc;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.daily_words    enable row level security;
alter table public.word_responses enable row level security;

-- -- DAILY_WORDS -----------------------------------------------
-- lecture ouverte a tout membre authentifie ; ecriture reservee a l'admin
create policy "daily_words_select" on public.daily_words
  for select using (auth.uid() is not null);

create policy "daily_words_admin" on public.daily_words
  for all using (public.is_admin()) with check (public.is_admin());

-- -- WORD_RESPONSES --------------------------------------------
-- lecture : la mienne toujours ; celles des autres seulement une fois
-- que j'ai ecrit ma ligne, et hors blocage
create policy "word_responses_select" on public.word_responses
  for select using (
    auth.uid() is not null
    and (
      user_id = auth.uid()
      or (
        public.has_answered(daily_word_id)
        and not public.is_blocked(user_id)
      )
    )
  );

create policy "word_responses_insert" on public.word_responses
  for insert with check (user_id = auth.uid());

create policy "word_responses_update" on public.word_responses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "word_responses_delete" on public.word_responses
  for delete using (user_id = auth.uid());

create policy "admin_all_word_responses" on public.word_responses
  for all using (public.is_admin());

-- ============================================================
-- QUOTA : 3 CONNEXIONS PAR JOUR
--
-- Pose dans la policy plutot que cote client : infalsifiable, atomique,
-- et coherent avec le rate-limit horaire deja en place. Le plafond
-- 50/heure est conserve tel quel - il ne coute rien et couvre le cas
-- d'un quota journalier qui viendrait a etre releve.
-- ============================================================

drop policy if exists "likes_insert" on public.likes;

create policy "likes_insert" on public.likes
  for insert
  with check (
    -- on n'insere que ses propres connexions
    from_id = auth.uid()

    -- la cible n'est pas bloquee
    and not public.is_blocked(to_id)

    -- moins de 50 connexions envoyees dans la derniere heure
    and (
      select count(*)
      from public.likes
      where from_id = auth.uid()
        and created_at > now() - interval '1 hour'
    ) < 50

    -- moins de 3 connexions envoyees aujourd'hui (heure de Paris)
    and (
      select count(*)
      from public.likes
      where from_id = auth.uid()
        and (created_at at time zone 'Europe/Paris')
            >= date_trunc('day', (now() at time zone 'Europe/Paris'))
    ) < 3
  );

-- ============================================================
-- SEED - 30 mots a partir du 23/08/2026
-- ============================================================

insert into public.daily_words (word, publish_date)
values
  ('Seuil',      date '2026-08-23'),
  (E'Mar\u00E9e',      date '2026-08-24'),
  ('Insomnie',   date '2026-08-25'),
  ('Presque',    date '2026-08-26'),
  (E'\u00C9corce',     date '2026-08-27'),
  ('Dimanche',   date '2026-08-28'),
  (E'F\u00EAlure',     date '2026-08-29'),
  ('Encore',     date '2026-08-30'),
  ('Quai',       date '2026-08-31'),
  (E'Rentr\u00E9e',    date '2026-09-01'),
  ('Vertige',    date '2026-09-02'),
  ('Lenteur',    date '2026-09-03'),
  ('Chaise',     date '2026-09-04'),
  ('Sel',        date '2026-09-05'),
  ('Croisement', date '2026-09-06'),
  (E'Cr\u00E9puscule', date '2026-09-07'),
  ('Non-dit',    date '2026-09-08'),
  ('Lampe',      date '2026-09-09'),
  ('Lettre',     date '2026-09-10'),
  (E'\u00C9coute',     date '2026-09-11'),
  ('Vent',       date '2026-09-12'),
  ('Ticket',     date '2026-09-13'),
  ('Cloison',    date '2026-09-14'),
  ('Silence',    date '2026-09-15'),
  ('Fou rire',   date '2026-09-16'),
  ('Couvert',    date '2026-09-17'),
  (E'D\u00E9part',     date '2026-09-18'),
  ('Brouillon',  date '2026-09-19'),
  (E'Ti\u00E8de',      date '2026-09-20'),
  ('Demain',     date '2026-09-21')
on conflict (publish_date) do nothing;


-- ----------------------------------------------------------
-- | 20260823000100_profils_ecrits.sql
-- ----------------------------------------------------------

-- ============================================================
-- PROFILS ECRITS
--
-- Le profil n'est plus une photo et des cases a cocher : c'est un
-- prenom, un age, un lieu, et quatre reponses ecrites.
--
-- Aucune colonne n'est supprimee ici. couple_name, avatar_url,
-- orientation, seeking, limits et location restent en place le temps
-- que les ecrans qui s'en servent encore soient repris ; leur retrait
-- fera l'objet d'une migration de nettoyage a part.
-- ============================================================

-- ============================================================
-- IDENTITE INDIVIDUELLE
-- ============================================================

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists age          smallint,
  add column if not exists city         text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_len') then
    alter table public.profiles
      add constraint profiles_display_name_len
      check (display_name is null or char_length(display_name) between 1 and 40);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_age_range') then
    alter table public.profiles
      add constraint profiles_age_range
      check (age is null or age between 18 and 120);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_city_len') then
    alter table public.profiles
      add constraint profiles_city_len
      check (city is null or char_length(city) <= 60);
  end if;
end $$;

-- reprise de l'existant : le nom affiche part de couple_name
update public.profiles
set display_name = couple_name
where display_name is null;

-- ============================================================
-- LES QUATRE REPONSES QUI FONT LE PROFIL
-- ============================================================

create table if not exists public.profile_answers (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  slug       text not null,
  answer     text not null check (char_length(answer) between 1 and 400),
  updated_at timestamptz not null default now(),

  unique (user_id, slug),

  -- liste fermee : les intitules vivent cote app (src/lib/prompts.js),
  -- la base ne garde que les cles pour rester lisible en SQL
  constraint profile_answers_slug check (slug in (
    'phrase_pour_commencer',
    'ce_qui_me_fait_rester',
    'une_question',
    'ce_que_je_cherche'
  ))
);

create index if not exists profile_answers_user_idx
  on public.profile_answers (user_id);

drop trigger if exists profile_answers_updated_at on public.profile_answers;
create trigger profile_answers_updated_at
  before update on public.profile_answers
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.profile_answers enable row level security;

-- un profil se lit : c'est tout l'objet du site. Seul le blocage ferme la porte.
create policy "profile_answers_select" on public.profile_answers
  for select using (
    auth.uid() is not null
    and (user_id = auth.uid() or not public.is_blocked(user_id))
  );

create policy "profile_answers_insert" on public.profile_answers
  for insert with check (user_id = auth.uid());

create policy "profile_answers_update" on public.profile_answers
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "profile_answers_delete" on public.profile_answers
  for delete using (user_id = auth.uid());

create policy "admin_all_profile_answers" on public.profile_answers
  for all using (public.is_admin());

-- ============================================================
-- LECTURE
-- ============================================================

-- La liste de lecture : les lignes du jour, dans l'ordre ou elles ont
-- ete ecrites, avec de quoi ouvrir le profil de leur auteur.
--
-- Remplace le swipe : on ne trie plus des visages, on lit une page.
-- Comme get_today_responses, elle exige d'avoir ecrit sa propre ligne.
drop function if exists public.get_reading_list();

create or replace function public.get_reading_list()
returns table (
  user_id      uuid,
  display_name text,
  age          smallint,
  city         text,
  line         text,
  created_at   timestamptz
)
language sql
security definer
set search_path = public
as $$
  with today as (
    select w.id
    from public.daily_words w
    where w.publish_date <= current_date
    order by w.publish_date desc
    limit 1
  )
  select
    r.user_id,
    coalesce(pr.display_name, pr.couple_name) as display_name,
    pr.age,
    pr.city,
    r.line,
    r.created_at
  from public.word_responses r
  join today t            on t.id  = r.daily_word_id
  join public.profiles pr on pr.id = r.user_id
  where auth.uid() is not null
    and public.has_answered(t.id)
    and r.user_id <> auth.uid()
    and pr.status = 'active'
    and not public.is_blocked(r.user_id)
  order by r.created_at desc;
$$;

-- Une page de profil : l'identite, les quatre reponses, la derniere
-- ligne ecrite. En security definer pour rester lisible quelle que
-- soit la visibilite heritee de l'ancien modele.
drop function if exists public.get_profile_page(uuid);

create or replace function public.get_profile_page(p_user_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select case when p.id is null then null else json_build_object(
    'user_id',      p.id,
    'display_name', coalesce(p.display_name, p.couple_name),
    'age',          p.age,
    'city',         p.city,
    'answers', coalesce((
      select json_agg(json_build_object('slug', a.slug, 'answer', a.answer))
      from public.profile_answers a
      where a.user_id = p.id
    ), '[]'::json),
    'last_line', (
      select r.line
      from public.word_responses r
      where r.user_id = p.id
      order by r.created_at desc
      limit 1
    )
  ) end
  from public.profiles p
  where p.id = p_user_id
    and auth.uid() is not null
    and p.status = 'active'
    and not public.is_blocked(p.id);
$$;


-- ----------------------------------------------------------
-- | 20260823000200_carte_de_lecture.sql
-- ----------------------------------------------------------

-- ============================================================
-- LA CARTE DE LECTURE
--
-- get_reading_list() gagne les coordonnees : la meme requete sert la
-- liste, la pile et la carte. DROP puis CREATE parce que la signature
-- de retour change - un create or replace refuserait.
--
-- get_my_location() manquait : Discover l'appelait sans qu'elle existe,
-- le marqueur " Vous " ne s'est jamais affiche.
-- ============================================================

drop function if exists public.get_reading_list();

create or replace function public.get_reading_list()
returns table (
  user_id      uuid,
  display_name text,
  age          smallint,
  city         text,
  line         text,
  created_at   timestamptz,
  distance_km  float,
  lng          float,
  lat          float
)
language sql
security definer
set search_path = public
as $$
  with today as (
    select w.id
    from public.daily_words w
    where w.publish_date <= current_date
    order by w.publish_date desc
    limit 1
  ),
  moi as (
    select location from public.profiles where id = auth.uid()
  )
  select
    r.user_id,
    coalesce(pr.display_name, pr.couple_name) as display_name,
    pr.age,
    pr.city,
    r.line,
    r.created_at,
    case
      when pr.location is null or moi.location is null then null
      else round((st_distance(pr.location, moi.location) / 1000)::numeric, 0)::float
    end as distance_km,
    -- coordonnees floutees a ~500m : on situe une personne dans un
    -- quartier, jamais devant sa porte
    case
      when pr.location is null or pr.hide_location then null
      else round((st_x(pr.location::geometry) + (random() - 0.5) * 0.005)::numeric, 5)::float
    end as lng,
    case
      when pr.location is null or pr.hide_location then null
      else round((st_y(pr.location::geometry) + (random() - 0.5) * 0.005)::numeric, 5)::float
    end as lat
  from public.word_responses r
  join today t            on t.id  = r.daily_word_id
  join public.profiles pr on pr.id = r.user_id
  cross join moi
  where auth.uid() is not null
    and public.has_answered(t.id)
    and r.user_id <> auth.uid()
    and pr.status = 'active'
    and not public.is_blocked(r.user_id)
  order by r.created_at desc;
$$;

-- Ma propre position, pour le marqueur " Vous ".
drop function if exists public.get_my_location();

create or replace function public.get_my_location()
returns table (lng float, lat float)
language sql
security definer
set search_path = public
as $$
  select
    st_x(location::geometry)::float as lng,
    st_y(location::geometry)::float as lat
  from public.profiles
  where id = auth.uid()
    and location is not null;
$$;


-- ----------------------------------------------------------
-- | 20260823000300_fin_du_mode_couple.sql
-- ----------------------------------------------------------

-- ============================================================
-- FIN DU MODE COUPLE
--
-- Konnexyon n'est plus un site libertin pour couples : c'est un site
-- de rencontre par l'ecriture, entre individus. Cette migration solde
-- l'ancien modele.
--
-- Elle supprime des colonnes et des donnees. Elle n'est pas
-- reversible : a passer en connaissance de cause.
-- ============================================================

-- ============================================================
-- 1. SAUVEGARDE DE L'IDENTITE
-- ============================================================

update public.profiles
set display_name = couple_name
where display_name is null and couple_name is not null;

-- ============================================================
-- 1 bis. ARCHIVE DE CE QUI VA DISPARAITRE
--
-- Les colonnes supprimees plus bas contiennent de vraies donnees de
-- membres. On les recopie avant, pour qu'un regret reste reparable.
--
-- RLS activee sans aucune policy : la table devient invisible depuis
-- l'API publique. Sans ca, PostgREST l'exposerait aux clients.
-- ============================================================

create table if not exists public.archive_profils_couple as
select
  id,
  couple_name,
  avatar_url,
  orientation::text as orientation,
  orientation_lui,
  orientation_elle,
  looking_for::text[] as looking_for,
  seeking,
  "limits",
  availabilities,
  email_2,
  email_2_confirmed,
  now() as archive_le
from public.profiles;

alter table public.archive_profils_couple enable row level security;

comment on table public.archive_profils_couple is
  E'Colonnes du mod\u00E8le couple, archiv\u00E9es avant leur suppression le 24/08/2026. Aucune policy : lecture r\u00E9serv\u00E9e au service_role.';

-- ============================================================
-- 2. PROFILS DE DEMONSTRATION LIBERTINS
--    (seed 20260101001800, prefixe d'identifiant 11111111-)
-- ============================================================

delete from public.profiles where id::text like '11111111-%';

-- ============================================================
-- 3. FONCTIONS QUI LISENT LES COLONNES CONDAMNEES
--    Elles doivent etre reecrites AVANT le DROP COLUMN.
-- ============================================================

-- fils de discussion : plus de nom de couple, plus de photo
drop function if exists public.get_message_threads(uuid);

create or replace function public.get_message_threads(p_profile_id uuid)
returns table (
  match_id     uuid,
  other_id     uuid,
  display_name text,
  content      text,
  photo_url    text,
  created_at   timestamptz,
  sender_id    uuid,
  read_at      timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (m.id)
    m.id as match_id,
    case when m.couple_a = p_profile_id then m.couple_b else m.couple_a end as other_id,
    p.display_name,
    msg.content,
    msg.photo_url,
    msg.created_at,
    msg.sender_id,
    msg.read_at
  from public.matches m
  join public.profiles p
    on p.id = case when m.couple_a = p_profile_id then m.couple_b else m.couple_a end
  left join lateral (
    select content, photo_url, created_at, sender_id, read_at
    from public.messages
    where match_id = m.id
    order by created_at desc
    limit 1
  ) msg on true
  where m.couple_a = p_profile_id or m.couple_b = p_profile_id
  order by m.id, msg.created_at desc nulls last;
$$;

grant execute on function public.get_message_threads(uuid) to authenticated;

-- lignes du jour : le pseudo devient le prenom
drop function if exists public.get_today_responses();

create or replace function public.get_today_responses()
returns table (
  id          uuid,
  user_id     uuid,
  pseudo      text,
  line        text,
  created_at  timestamptz
)
language sql
security definer
set search_path = public
as $$
  with today as (
    select w.id from public.daily_words w
    where w.publish_date <= current_date
    order by w.publish_date desc limit 1
  )
  select r.id, r.user_id, pr.display_name as pseudo, r.line, r.created_at
  from public.word_responses r
  join today t            on t.id  = r.daily_word_id
  join public.profiles pr on pr.id = r.user_id
  where auth.uid() is not null
    and public.has_answered(t.id)
    and r.user_id <> auth.uid()
    and pr.status = 'active'
    and not public.is_blocked(r.user_id)
    and not exists (
      select 1 from public.likes l
      where l.from_id = auth.uid() and l.to_id = r.user_id
    )
  order by r.created_at desc;
$$;

-- liste de lecture : plus de repli sur couple_name
drop function if exists public.get_reading_list();

create or replace function public.get_reading_list()
returns table (
  user_id      uuid,
  display_name text,
  age          smallint,
  city         text,
  line         text,
  created_at   timestamptz,
  distance_km  float,
  lng          float,
  lat          float
)
language sql
security definer
set search_path = public
as $$
  with today as (
    select w.id from public.daily_words w
    where w.publish_date <= current_date
    order by w.publish_date desc limit 1
  ),
  moi as (select location from public.profiles where id = auth.uid())
  select
    r.user_id,
    pr.display_name,
    pr.age,
    pr.city,
    r.line,
    r.created_at,
    case
      when pr.location is null or moi.location is null then null
      else round((st_distance(pr.location, moi.location) / 1000)::numeric, 0)::float
    end as distance_km,
    -- coordonnees floutees a ~500m : on situe une personne dans un
    -- quartier, jamais devant sa porte
    case when pr.location is null or pr.hide_location then null
         else round((st_x(pr.location::geometry) + (random() - 0.5) * 0.005)::numeric, 5)::float end as lng,
    case when pr.location is null or pr.hide_location then null
         else round((st_y(pr.location::geometry) + (random() - 0.5) * 0.005)::numeric, 5)::float end as lat
  from public.word_responses r
  join today t            on t.id  = r.daily_word_id
  join public.profiles pr on pr.id = r.user_id
  cross join moi
  where auth.uid() is not null
    and public.has_answered(t.id)
    and r.user_id <> auth.uid()
    and pr.status = 'active'
    and not public.is_blocked(r.user_id)
  order by r.created_at desc;
$$;

-- page de profil : idem
drop function if exists public.get_profile_page(uuid);

create or replace function public.get_profile_page(p_user_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select case when p.id is null then null else json_build_object(
    'user_id',      p.id,
    'display_name', p.display_name,
    'age',          p.age,
    'city',         p.city,
    'answers', coalesce((
      select json_agg(json_build_object('slug', a.slug, 'answer', a.answer))
      from public.profile_answers a where a.user_id = p.id
    ), '[]'::json),
    'last_line', (
      select r.line from public.word_responses r
      where r.user_id = p.id order by r.created_at desc limit 1
    )
  ) end
  from public.profiles p
  where p.id = p_user_id
    and auth.uid() is not null
    and p.status = 'active'
    and not public.is_blocked(p.id);
$$;

-- ============================================================
-- 4. FONCTIONS ET TABLES PROPRES AU MODE COUPLE
-- ============================================================

-- appariement par orientation croisee et proximite : remplace par la
-- liste de lecture du jour
drop function if exists public.get_nearby_compatible_profiles(integer);

-- double confirmation par e-mail du second partenaire
drop function if exists public.confirm_partner_token(text);
drop table    if exists public.partner_confirmations;

-- verrou des colonnes monetisees : il recopiait aussi des colonnes
-- qui disparaissent, on le reecrit sur ce qui reste
create or replace function public.lock_sensitive_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  new.plan            := old.plan;
  new.plan_expires_at := old.plan_expires_at;
  new.status          := old.status;
  return new;
end;
$$;

-- ============================================================
-- 5. LES COLONNES
-- ============================================================

alter table public.profiles
  drop column if exists couple_name,
  drop column if exists avatar_url,          -- " pas de photo "
  drop column if exists orientation,
  drop column if exists orientation_lui,
  drop column if exists orientation_elle,
  drop column if exists looking_for,
  drop column if exists seeking,
  drop column if exists limits,
  drop column if exists availabilities,
  drop column if exists email_2,
  drop column if exists email_2_confirmed;

-- display_name devient l'identite : obligatoire une fois renseignee
update public.profiles set display_name = 'Anonyme' where display_name is null;
alter table public.profiles alter column display_name set not null;

-- ============================================================
-- 6. LES TYPES DEVENUS ORPHELINS
-- ============================================================

drop type if exists public.couple_orientation;
drop type if exists public.looking_for_type;

-- ============================================================
-- 7. LES PHOTOS DE MESSAGERIE
--
-- La messagerie garde l'envoi de photo pour l'instant : seule la photo
-- de profil disparait. Si tu veux une messagerie purement ecrite, dis-le
-- et messages.photo_url part avec le bucket chat-photos.
-- ============================================================

comment on column public.profiles.display_name is
  E'Pr\u00E9nom ou nom affich\u00E9. Remplace couple_name depuis le passage aux profils individuels.';


-- ----------------------------------------------------------
-- | 20260823000400_compatibilite.sql
-- ----------------------------------------------------------

-- ============================================================
-- COMPATIBILITE INTELLECTUELLE
--
-- Seize questions, quatre themes, une echelle de 1 a 5.
-- Les reponses vivent dans une table a part, lisible par son seul
-- proprietaire : le score est calcule en base par des fonctions
-- security definer, et on expose un pourcentage, jamais un profil
-- psychologique. Une colonne sur profiles n'aurait pas tenu - la policy
-- profiles_select laisse lire la ligne entiere des autres membres.
--
-- Le meme calcul existe en JS (src/lib/compatibility.js) pour le mode
-- demo et les tests. Les deux doivent rester d'accord.
-- ============================================================

create table if not exists public.profile_traits (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  traits     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profile_traits enable row level security;

-- personne d'autre que soi ne lit ses reponses, pas meme pour comparer :
-- la comparaison passe par compat_score, en security definer
create policy "profile_traits_own" on public.profile_traits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists profile_traits_updated_at on public.profile_traits;
create trigger profile_traits_updated_at
  before update on public.profile_traits
  for each row execute function public.set_updated_at();

-- lecture des reponses de n'importe qui, reservee aux fonctions internes
drop function if exists public.traits_of(uuid);

create or replace function public.traits_of(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select t.traits from public.profile_traits t where t.user_id = p_user_id),
    '{}'::jsonb
  );
$$;

-- ============================================================
-- LE CALCUL
--
-- Sur chaque question repondue des deux cotes, l'accord vaut
-- 1 - ecart/4. Les themes pesent le meme poids, pour qu'un theme tres
-- rempli n'ecrase pas les autres. En dessous de 8 reponses communes,
-- le score ne veut rien dire : on renvoie NULL.
-- ============================================================

drop function if exists public.compat_score(jsonb, jsonb);

create or replace function public.compat_score(a jsonb, b jsonb)
returns smallint
language plpgsql
immutable
as $$
declare
  themes text[] := array['qui_je_suis', 'mes_gouts', 'ma_pensee', 'ce_que_je_cherche'];
  slugs  text[][] := array[
    array['soiree', 'rythme', 'humour', 'reserve'],
    array['lecture', 'musique', 'cinema', 'ailleurs'],
    array['discuter', 'certitude', 'desordre', 'matiere'],
    array['cherche_tempo', 'cherche_parole', 'cherche_accord', 'cherche_horizon']
  ];
  t          int;
  s          int;
  slug       text;
  va         int;
  vb         int;
  theme_sum  numeric;
  theme_n    int;
  total      numeric := 0;
  themes_n   int := 0;
  common     int := 0;
begin
  if a is null or b is null then
    return null;
  end if;

  for t in 1..array_length(themes, 1) loop
    theme_sum := 0;
    theme_n   := 0;

    for s in 1..4 loop
      slug := slugs[t][s];
      -- une valeur hors echelle ou non entiere est ignoree, comme en JS
      begin
        va := (a ->> slug)::int;
        vb := (b ->> slug)::int;
      exception when others then
        va := null; vb := null;
      end;

      if va between 1 and 5 and vb between 1 and 5 then
        theme_sum := theme_sum + (1 - abs(va - vb)::numeric / 4);
        theme_n   := theme_n + 1;
        common    := common + 1;
      end if;
    end loop;

    if theme_n > 0 then
      total    := total + round((theme_sum / theme_n) * 100);
      themes_n := themes_n + 1;
    end if;
  end loop;

  if common < 8 or themes_n = 0 then
    return null;
  end if;

  return round(total / themes_n)::smallint;
end;
$$;

-- ============================================================
-- EXPOSITION
-- ============================================================

drop function if exists public.get_reading_list();

create or replace function public.get_reading_list()
returns table (
  user_id       uuid,
  display_name  text,
  age           smallint,
  city          text,
  line          text,
  created_at    timestamptz,
  distance_km   float,
  lng           float,
  lat           float,
  compatibility smallint
)
language sql
security definer
set search_path = public
as $$
  with today as (
    select w.id from public.daily_words w
    where w.publish_date <= current_date
    order by w.publish_date desc limit 1
  ),
  moi as (select location from public.profiles where id = auth.uid())
  select
    r.user_id,
    pr.display_name,
    pr.age,
    pr.city,
    r.line,
    r.created_at,
    case
      when pr.location is null or moi.location is null then null
      else round((st_distance(pr.location, moi.location) / 1000)::numeric, 0)::float
    end as distance_km,
    -- coordonnees floutees a ~500m : on situe une personne dans un
    -- quartier, jamais devant sa porte
    case when pr.location is null or pr.hide_location then null
         else round((st_x(pr.location::geometry) + (random() - 0.5) * 0.005)::numeric, 5)::float end as lng,
    case when pr.location is null or pr.hide_location then null
         else round((st_y(pr.location::geometry) + (random() - 0.5) * 0.005)::numeric, 5)::float end as lat,
    public.compat_score(public.traits_of(auth.uid()), public.traits_of(pr.id)) as compatibility
  from public.word_responses r
  join today t            on t.id  = r.daily_word_id
  join public.profiles pr on pr.id = r.user_id
  cross join moi
  where auth.uid() is not null
    and public.has_answered(t.id)
    and r.user_id <> auth.uid()
    and pr.status = 'active'
    and not public.is_blocked(r.user_id)
  order by r.created_at desc;
$$;

drop function if exists public.get_profile_page(uuid);

create or replace function public.get_profile_page(p_user_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select case when p.id is null then null else json_build_object(
    'user_id',      p.id,
    'display_name', p.display_name,
    'age',          p.age,
    'city',         p.city,
    'answers', coalesce((
      select json_agg(json_build_object('slug', a.slug, 'answer', a.answer))
      from public.profile_answers a where a.user_id = p.id
    ), '[]'::json),
    'last_line', (
      select r.line from public.word_responses r
      where r.user_id = p.id order by r.created_at desc limit 1
    ),
    'compatibility', public.compat_score(
      public.traits_of(auth.uid()),
      public.traits_of(p.id)
    ),
    -- combien de questions la personne a remplies : de quoi expliquer
    -- un score absent sans reveler une seule de ses reponses
    'traits_answered', (
      select count(*) from jsonb_object_keys(public.traits_of(p.id))
    )
  ) end
  from public.profiles p
  where p.id = p_user_id
    and auth.uid() is not null
    and p.status = 'active'
    and not public.is_blocked(p.id);
$$;

-- Combien de questions j'ai remplies, pour la barre de progression de
-- mon propre profil.
drop function if exists public.my_traits();

create or replace function public.my_traits()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.traits_of(auth.uid());
$$;


-- ----------------------------------------------------------
-- | 20260823000500_matches_entre_personnes.sql
-- ----------------------------------------------------------

-- ============================================================
-- LA TABLE MATCHES PARLE ENCORE DE COUPLES
--
-- couple_a / couple_b etaient les deux couples d'une connexion. Ce sont
-- desormais deux personnes : on renomme. Derniere trace structurelle du
-- modele abandonne.
-- ============================================================

alter table public.matches rename column couple_a to member_a;
alter table public.matches rename column couple_b to member_b;

alter index if exists matches_a_idx rename to matches_member_a_idx;
alter index if exists matches_b_idx rename to matches_member_b_idx;

-- ============================================================
-- LES OBJETS QUI S'Y REFERENT
-- ============================================================

-- creation automatique de la connexion reciproque
create or replace function public.create_match_if_mutual()
returns trigger language plpgsql security definer
set search_path = public as $$
declare a uuid; b uuid;
begin
  if exists (
    select 1 from public.likes
    where from_id = new.to_id and to_id = new.from_id
  ) then
    -- member_a < member_b : l'ordre garantit l'unicite sans doublon
    a := least(new.from_id, new.to_id);
    b := greatest(new.from_id, new.to_id);
    insert into public.matches (member_a, member_b) values (a, b)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.delete_match_on_unlike()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  delete from public.matches
  where member_a = least(old.from_id, old.to_id)
    and member_b = greatest(old.from_id, old.to_id);
  return old;
end;
$$;

-- fils de discussion
drop function if exists public.get_message_threads(uuid);

create or replace function public.get_message_threads(p_profile_id uuid)
returns table (
  match_id     uuid,
  other_id     uuid,
  display_name text,
  content      text,
  photo_url    text,
  created_at   timestamptz,
  sender_id    uuid,
  read_at      timestamptz
)
language sql stable security definer
set search_path = public as $$
  select distinct on (m.id)
    m.id as match_id,
    case when m.member_a = p_profile_id then m.member_b else m.member_a end as other_id,
    p.display_name,
    msg.content, msg.photo_url, msg.created_at, msg.sender_id, msg.read_at
  from public.matches m
  join public.profiles p
    on p.id = case when m.member_a = p_profile_id then m.member_b else m.member_a end
  left join lateral (
    select content, photo_url, created_at, sender_id, read_at
    from public.messages where match_id = m.id
    order by created_at desc limit 1
  ) msg on true
  where m.member_a = p_profile_id or m.member_b = p_profile_id
  order by m.id, msg.created_at desc nulls last;
$$;

grant execute on function public.get_message_threads(uuid) to authenticated;

-- ============================================================
-- LES POLICIES
-- ============================================================

drop policy if exists "matches_select" on public.matches;
create policy "matches_select" on public.matches
  for select using (member_a = auth.uid() or member_b = auth.uid());

drop policy if exists "matches_delete_own" on public.matches;
create policy "matches_delete_own" on public.matches
  for delete using (member_a = auth.uid() or member_b = auth.uid());

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.member_a = auth.uid() or m.member_b = auth.uid())
    )
    and not (auth.uid() = any(deleted_for))
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id and (m.member_a = auth.uid() or m.member_b = auth.uid())
    )
  );

drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages
  for update
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.member_a = auth.uid() or m.member_b = auth.uid())
    )
  )
  with check (
    -- modification du contenu : expediteur uniquement
    sender_id = auth.uid()
    -- ou mise a jour de read_at seule, contenu et photo inchanges
    or exists (
      select 1 from public.messages orig
      where orig.id = id
        and orig.content   is not distinct from content
        and orig.photo_url is not distinct from photo_url
    )
  );

-- la visibilite restreinte des profils s'appuyait aussi sur ces colonnes
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    auth.uid() is not null
    and not public.is_blocked(id)
    and (
      -- toujours voir son propre profil, meme suspendu
      id = auth.uid()
      or (
        status = 'active'
        and (
          visibility = 'public'
          or (
            visibility in ('matches_only', 'discreet')
            and exists (
              select 1 from public.matches
              where member_a = least(auth.uid(), id)
                and member_b = greatest(auth.uid(), id)
            )
          )
        )
      )
    )
  );


-- ----------------------------------------------------------
-- | 20260824000000_boutique.sql
-- ----------------------------------------------------------

-- ============================================================
-- LA PAPETERIE - la boutique de Konnexyon
--
--   - products     : le catalogue (lecture publique)
--   - orders       : une commande par passage en caisse
--   - order_items  : le detail, fige au prix du jour de la commande
--
-- Principe : le catalogue est public en lecture, ecrit uniquement par
-- le service_role (import produit / back-office). Les commandes sont
-- privees : chacun ne voit que les siennes, et ne peut jamais les
-- modifier apres coup - seul le webhook de paiement (service_role)
-- fait avancer le statut.
--
-- Aucune migration existante n'est modifiee.
-- ============================================================

-- ============================================================
-- CATALOGUE
-- ============================================================

create table if not exists public.products (
  id           uuid primary key default uuid_generate_v4(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name         text not null check (char_length(name) between 1 and 120),
  tagline      text,
  description  text,
  -- centimes : jamais de flottant sur de l'argent
  price_cents  integer not null check (price_cents >= 0),
  compare_cents integer check (compare_cents is null or compare_cents > price_cents),
  currency     text not null default 'EUR' check (currency = 'EUR'),
  -- 'kit' | 'carnet' | 'ecriture' | 'papier' | 'abonnement'
  category     text not null,
  -- cle de l'illustration SVG cote client (src/components/boutique/Plates.jsx)
  plate        text not null,
  -- null = stock non suivi (abonnement, print on demand)
  stock        integer check (stock is null or stock >= 0),
  -- ordre d'affichage en rayon, petit = en tete
  rank         integer not null default 100,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists products_active_rank_idx
  on public.products (is_active, rank, created_at);

alter table public.products enable row level security;

-- le rayon est public : on peut lire le catalogue sans compte
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select using (is_active = true);

-- ============================================================
-- COMMANDES
-- ============================================================

create table if not exists public.orders (
  id             uuid primary key default uuid_generate_v4(),
  -- null = commande invitee (achat sans compte Konnexyon)
  user_id        uuid references public.profiles(id) on delete set null,
  email          text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- 'en_attente' | 'payee' | 'expediee' | 'annulee' | 'remboursee'
  status         text not null default 'en_attente'
                 check (status in ('en_attente','payee','expediee','annulee','remboursee')),
  total_cents    integer not null check (total_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  currency       text not null default 'EUR',
  -- adresse figee au moment de la commande (jsonb : elle ne doit pas
  -- suivre les modifications ulterieures du profil)
  shipping       jsonb,
  -- identifiant de session Stripe Checkout, pose par la fonction edge
  payment_ref    text unique,
  -- d'ou vient la commande : utm de la campagne Meta / TikTok
  source         text,
  created_at     timestamptz not null default now(),
  paid_at        timestamptz
);

create index if not exists orders_user_idx
  on public.orders (user_id, created_at desc);

alter table public.orders enable row level security;

-- je ne vois que mes commandes
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (user_id = auth.uid());

-- je peux creer une commande, uniquement a mon nom et uniquement
-- en attente de paiement : le montant paye n'est jamais decide client.
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert with check (
    user_id = auth.uid()
    and status = 'en_attente'
    and paid_at is null
  );

-- pas de policy update ni delete : une fois posee, une commande
-- n'est plus touchee que par le service_role (webhook de paiement).

-- ============================================================
-- LIGNES DE COMMANDE
-- ============================================================

create table if not exists public.order_items (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references public.orders(id)   on delete cascade,
  product_id    uuid not null references public.products(id) on delete restrict,
  -- nom et prix recopies : le catalogue peut changer, pas la facture
  name_snapshot text not null,
  unit_cents    integer not null check (unit_cents >= 0),
  quantity      integer not null check (quantity between 1 and 20),
  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_idx
  on public.order_items (order_id);

alter table public.order_items enable row level security;

-- je lis les lignes des commandes qui sont a moi
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
        and o.status = 'en_attente'
    )
  );

-- ============================================================
-- CATALOGUE DE DEPART
--
-- Les prix suivent le marche francais de la papeterie premium
-- (Papier, Mark+Fold, Katie Leamon) : positionnement cadeau,
-- pas positionnement fourniture.
-- ============================================================

insert into public.products
  (slug, name, tagline, description, price_cents, compare_cents, category, plate, stock, rank)
values
  ('necessaire-a-lettres',
   E'Le N\u00E9cessaire \u00E0 lettres',
   E'Tout ce qu\'il faut pour \u00E9crire \u00E0 quelqu\'un.',
   E'Un sceau de cire \u00E0 votre initiale, six b\u00E2tons de cire ivoire, un porte-plume en bois tourn\u00E9, un encrier d\'encre noire, dix cartes et dix enveloppes en coton. Pr\u00E9sent\u00E9 dans un coffret toil\u00E9. C\'est le geste complet, du premier mot au cachet.',
   6800, 8500, 'kit', 'necessaire', 120, 10),

  ('carnet-du-mot-du-jour',
   'Le Carnet du Mot du jour',
   'Une ligne par jour, trois cent soixante-cinq fois.',
   E'Le pendant papier de votre carnet Konnexyon. Une page par jour : le mot en haut, une seule ligne \u00E0 remplir en dessous. Papier ivoire 120 g, ouverture \u00E0 plat, signet dor\u00E9. Ce que vous \u00E9crivez sur l\'\u00E9cran, vous pouvez le r\u00E9\u00E9crire ici \u2014 c\'est le m\u00EAme geste, en plus lent.',
   3200, null, 'carnet', 'carnet', 200, 20),

  ('cartes-questions',
   'Les Cartes-questions',
   E'Cinquante-deux questions, aucune r\u00E9ponse facile.',
   E'Les questions de Konnexyon, imprim\u00E9es sur cinquante-deux cartes au format jeu. \u00AB Une chose que tu ne dis presque jamais. \u00BB \u00AB Quelle phrase pourrait te faire changer d\'avis ? \u00BB \u00C0 tirer seul devant une page blanche, ou \u00E0 deux, \u00E0 voix haute.',
   2400, null, 'carnet', 'cartes', 300, 30),

  ('sceau-konnexyon',
   'Le Sceau',
   'Votre initiale, dans la cire.',
   E'Sceau en laiton massif mont\u00E9 sur manche de noyer, grav\u00E9 \u00E0 l\'initiale de votre choix. Livr\u00E9 avec vingt b\u00E2tons de cire \u2014 noir d\'encre, ivoire ou or. La cire fond en quarante secondes et tient des ann\u00E9es.',
   2900, null, 'ecriture', 'sceau', 250, 40),

  ('porte-plume-et-encre',
   'Le Porte-plume & l''encre',
   'La main ralentit, la phrase change.',
   E'Porte-plume en bois tourn\u00E9, trois becs de rechange, et un encrier de trente millilitres d\'encre noire. \u00C9crire \u00E0 la plume oblige \u00E0 savoir o\u00F9 l\'on va avant de poser le mot \u2014 c\'est exactement le point.',
   4400, null, 'ecriture', 'plume', 140, 50),

  ('encre-d-or',
   'L''Encre d''or',
   'Pour la phrase qui compte.',
   E'Trente millilitres d\'encre dor\u00E9e \u00E0 particules, \u00E0 agiter avant usage. Sur le papier ivoire, elle accroche la lumi\u00E8re. \u00C0 r\u00E9server aux quelques lignes qui le m\u00E9ritent.',
   1800, null, 'ecriture', 'encre', 400, 60),

  ('papier-a-lettres',
   E'Le Papier \u00E0 lettres',
   'Quarante feuilles, vingt enveloppes.',
   E'Papier de coton ivoire 120 g, non lign\u00E9, filigran\u00E9 \u00E0 la plume. Vingt enveloppes doubl\u00E9es assorties. La recharge du N\u00E9cessaire \u2014 parce qu\'on \u00E9crit plus qu\'on ne le croyait.',
   2200, null, 'papier', 'papier', 500, 70),

  ('abonnement-correspondance',
   'L''Abonnement Correspondance',
   E'Chaque mois, de quoi \u00E9crire \u00E0 quelqu\'un.',
   E'Le premier de chaque mois, une enveloppe arrive : du papier, une encre ou une cire, et une carte-question in\u00E9dite qui n\'existe nulle part ailleurs. Sans engagement, r\u00E9siliable en un clic.',
   2400, null, 'abonnement', 'abonnement', null, 80)
on conflict (slug) do nothing;


-- ============================================================
-- VERIFICATION
-- ============================================================

select 'colonnes couple restantes' as controle, count(*)::text as valeur
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('couple_name','avatar_url','orientation','seeking','limits','email_2')

union all
select 'nouvelles tables', string_agg(table_name, ', ' order by table_name)
from information_schema.tables
where table_schema = 'public'
  and table_name in ('daily_words','word_responses','profile_answers','profile_traits',
                     'products','orders','order_items','archive_profils_couple')

union all select 'mots du jour seedes',   count(*)::text from public.daily_words
union all select 'accent restitue',       coalesce((select word from public.daily_words where publish_date = date '2026-08-24'), 'ABSENT')
union all select 'profils restants',      count(*)::text from public.profiles
union all select 'lignes archivees',      count(*)::text from public.archive_profils_couple
union all select 'produits au catalogue', count(*)::text from public.products

union all
select 'colonnes de matches', string_agg(column_name, ', ' order by column_name)
from information_schema.columns
where table_schema = 'public' and table_name = 'matches';

commit;
