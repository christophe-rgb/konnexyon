-- ════════════════════════════════════════════════════════════
-- KONNEXYON — BASCULE VERS LE SITE DE RENCONTRE PAR L'ÉCRITURE
--
-- À coller tel quel dans l'éditeur SQL de Supabase, puis Run.
--
-- Les six migrations sont réunies ici dans l'ordre et enveloppées
-- dans une seule transaction : en Postgres le DDL est transactionnel,
-- donc si la moindre instruction échoue, RIEN n'est appliqué et la
-- base reste exactement dans son état actuel.
--
-- ⚠️  CETTE MIGRATION DÉTRUIT DES DONNÉES, SANS RETOUR POSSIBLE :
--     • colonnes supprimées sur profiles : couple_name, avatar_url,
--       orientation, orientation_lui, orientation_elle, looking_for,
--       seeking, limits, availabilities, email_2, email_2_confirmed
--     • table partner_confirmations supprimée
--     • les douze faux profils libertins du seed sont effacés
--
--     Fais une sauvegarde avant (Dashboard → Database → Backups).
--
-- ⚠️  DÈS QUE CE SCRIPT PASSE, www.konnexyon.com CASSE : le code en
--     production lit encore couple_name et avatar_url. Préviens-moi
--     aussitôt, je promeus la nouvelle version dans la foulée.
-- ════════════════════════════════════════════════════════════

begin;

-- ┌────────────────────────────────────────────────────────
-- │ 20260823000000_daily_words.sql
-- └────────────────────────────────────────────────────────

-- ============================================================
-- MOT DU JOUR
--   • daily_words    : un mot publié par jour
--   • word_responses : la ligne que chaque membre écrit en réaction
--
-- Aucune migration existante n'est modifiée. La seule policy reprise
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

-- lecture de « Mon carnet » (anti-chronologique)
create index if not exists word_responses_user_idx
  on public.word_responses (user_id, created_at desc);

-- ============================================================
-- HELPERS (security definer)
-- ============================================================

-- Ai-je déjà écrit ma ligne pour ce mot ?
--
-- Indispensable en security definer : appelée depuis la policy SELECT de
-- word_responses, une sous-requête directe sur word_responses ferait
-- récursion infinie. Même contournement que public.is_blocked().
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

-- Le mot du jour. Prend le plus récent déjà publié plutôt qu'une égalité
-- stricte sur current_date : un trou dans le calendrier ne casse pas
-- l'écran, il prolonge simplement le mot de la veille.
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
-- Journée calée sur Europe/Paris : le compteur se remet à zéro à minuit
-- heure française, pas à 2h du matin comme le ferait un date_trunc UTC.
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
-- En security definer pour ne pas dépendre de la policy SELECT de profiles :
-- un membre en visibilité 'discreet' verrait sinon sa ligne disparaître de
-- la pile faute de pouvoir lire son couple_name. Les exclusions (soi-même,
-- bloqués, déjà connectés) restent appliquées ici explicitement.
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
    -- on ne découvre les lignes des autres qu'après avoir écrit la sienne
    and public.has_answered(t.id)
    and r.user_id <> auth.uid()
    and pr.status = 'active'
    and not public.is_blocked(r.user_id)
    -- déjà connecté : on ne le repropose pas
    and not exists (
      select 1 from public.likes l
      where l.from_id = auth.uid() and l.to_id = r.user_id
    )
  order by r.created_at desc;
$$;

-- Mon carnet : mes lignes, chacune avec son mot, anti-chronologique.
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

-- ── DAILY_WORDS ───────────────────────────────────────────────
-- lecture ouverte à tout membre authentifié ; écriture réservée à l'admin
create policy "daily_words_select" on public.daily_words
  for select using (auth.uid() is not null);

create policy "daily_words_admin" on public.daily_words
  for all using (public.is_admin()) with check (public.is_admin());

-- ── WORD_RESPONSES ────────────────────────────────────────────
-- lecture : la mienne toujours ; celles des autres seulement une fois
-- que j'ai écrit ma ligne, et hors blocage
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
-- Posé dans la policy plutôt que côté client : infalsifiable, atomique,
-- et cohérent avec le rate-limit horaire déjà en place. Le plafond
-- 50/heure est conservé tel quel — il ne coûte rien et couvre le cas
-- d'un quota journalier qui viendrait à être relevé.
-- ============================================================

drop policy if exists "likes_insert" on public.likes;

create policy "likes_insert" on public.likes
  for insert
  with check (
    -- on n'insère que ses propres connexions
    from_id = auth.uid()

    -- la cible n'est pas bloquée
    and not public.is_blocked(to_id)

    -- moins de 50 connexions envoyées dans la dernière heure
    and (
      select count(*)
      from public.likes
      where from_id = auth.uid()
        and created_at > now() - interval '1 hour'
    ) < 50

    -- moins de 3 connexions envoyées aujourd'hui (heure de Paris)
    and (
      select count(*)
      from public.likes
      where from_id = auth.uid()
        and (created_at at time zone 'Europe/Paris')
            >= date_trunc('day', (now() at time zone 'Europe/Paris'))
    ) < 3
  );

-- ============================================================
-- SEED — 30 mots à partir du 23/08/2026
-- ============================================================

insert into public.daily_words (word, publish_date)
values
  ('Seuil',      date '2026-08-23'),
  ('Marée',      date '2026-08-24'),
  ('Insomnie',   date '2026-08-25'),
  ('Presque',    date '2026-08-26'),
  ('Écorce',     date '2026-08-27'),
  ('Dimanche',   date '2026-08-28'),
  ('Fêlure',     date '2026-08-29'),
  ('Encore',     date '2026-08-30'),
  ('Quai',       date '2026-08-31'),
  ('Rentrée',    date '2026-09-01'),
  ('Vertige',    date '2026-09-02'),
  ('Lenteur',    date '2026-09-03'),
  ('Chaise',     date '2026-09-04'),
  ('Sel',        date '2026-09-05'),
  ('Croisement', date '2026-09-06'),
  ('Crépuscule', date '2026-09-07'),
  ('Non-dit',    date '2026-09-08'),
  ('Lampe',      date '2026-09-09'),
  ('Lettre',     date '2026-09-10'),
  ('Écoute',     date '2026-09-11'),
  ('Vent',       date '2026-09-12'),
  ('Ticket',     date '2026-09-13'),
  ('Cloison',    date '2026-09-14'),
  ('Silence',    date '2026-09-15'),
  ('Fou rire',   date '2026-09-16'),
  ('Couvert',    date '2026-09-17'),
  ('Départ',     date '2026-09-18'),
  ('Brouillon',  date '2026-09-19'),
  ('Tiède',      date '2026-09-20'),
  ('Demain',     date '2026-09-21')
on conflict (publish_date) do nothing;


-- ┌────────────────────────────────────────────────────────
-- │ 20260823000100_profils_ecrits.sql
-- └────────────────────────────────────────────────────────

-- ============================================================
-- PROFILS ÉCRITS
--
-- Le profil n'est plus une photo et des cases à cocher : c'est un
-- prénom, un âge, un lieu, et quatre réponses écrites.
--
-- Aucune colonne n'est supprimée ici. couple_name, avatar_url,
-- orientation, seeking, limits et location restent en place le temps
-- que les écrans qui s'en servent encore soient repris ; leur retrait
-- fera l'objet d'une migration de nettoyage à part.
-- ============================================================

-- ============================================================
-- IDENTITÉ INDIVIDUELLE
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

-- reprise de l'existant : le nom affiché part de couple_name
update public.profiles
set display_name = couple_name
where display_name is null;

-- ============================================================
-- LES QUATRE RÉPONSES QUI FONT LE PROFIL
-- ============================================================

create table if not exists public.profile_answers (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  slug       text not null,
  answer     text not null check (char_length(answer) between 1 and 400),
  updated_at timestamptz not null default now(),

  unique (user_id, slug),

  -- liste fermée : les intitulés vivent côté app (src/lib/prompts.js),
  -- la base ne garde que les clés pour rester lisible en SQL
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

-- La liste de lecture : les lignes du jour, dans l'ordre où elles ont
-- été écrites, avec de quoi ouvrir le profil de leur auteur.
--
-- Remplace le swipe : on ne trie plus des visages, on lit une page.
-- Comme get_today_responses, elle exige d'avoir écrit sa propre ligne.
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

-- Une page de profil : l'identité, les quatre réponses, la dernière
-- ligne écrite. En security definer pour rester lisible quelle que
-- soit la visibilité héritée de l'ancien modèle.
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


-- ┌────────────────────────────────────────────────────────
-- │ 20260823000200_carte_de_lecture.sql
-- └────────────────────────────────────────────────────────

-- ============================================================
-- LA CARTE DE LECTURE
--
-- get_reading_list() gagne les coordonnées : la même requête sert la
-- liste, la pile et la carte. DROP puis CREATE parce que la signature
-- de retour change — un create or replace refuserait.
--
-- get_my_location() manquait : Discover l'appelait sans qu'elle existe,
-- le marqueur « Vous » ne s'est jamais affiché.
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
    -- coordonnées floutées à ~500m : on situe une personne dans un
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

-- Ma propre position, pour le marqueur « Vous ».
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


-- ┌────────────────────────────────────────────────────────
-- │ 20260823000300_fin_du_mode_couple.sql
-- └────────────────────────────────────────────────────────

-- ============================================================
-- FIN DU MODE COUPLE
--
-- Konnexyon n'est plus un site libertin pour couples : c'est un site
-- de rencontre par l'écriture, entre individus. Cette migration solde
-- l'ancien modèle.
--
-- Elle supprime des colonnes et des données. Elle n'est pas
-- réversible : à passer en connaissance de cause.
-- ============================================================

-- ============================================================
-- 1. SAUVEGARDE DE L'IDENTITÉ
-- ============================================================

update public.profiles
set display_name = couple_name
where display_name is null and couple_name is not null;

-- ============================================================
-- 2. PROFILS DE DÉMONSTRATION LIBERTINS
--    (seed 20260101001800, préfixe d'identifiant 11111111-)
-- ============================================================

delete from public.profiles where id::text like '11111111-%';

-- ============================================================
-- 3. FONCTIONS QUI LISENT LES COLONNES CONDAMNÉES
--    Elles doivent être réécrites AVANT le DROP COLUMN.
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

-- lignes du jour : le pseudo devient le prénom
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
    -- coordonnées floutées à ~500m : on situe une personne dans un
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

-- appariement par orientation croisée et proximité : remplacé par la
-- liste de lecture du jour
drop function if exists public.get_nearby_compatible_profiles(integer);

-- double confirmation par e-mail du second partenaire
drop function if exists public.confirm_partner_token(text);
drop table    if exists public.partner_confirmations;

-- verrou des colonnes monétisées : il recopiait aussi des colonnes
-- qui disparaissent, on le réécrit sur ce qui reste
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
  drop column if exists avatar_url,          -- « pas de photo »
  drop column if exists orientation,
  drop column if exists orientation_lui,
  drop column if exists orientation_elle,
  drop column if exists looking_for,
  drop column if exists seeking,
  drop column if exists limits,
  drop column if exists availabilities,
  drop column if exists email_2,
  drop column if exists email_2_confirmed;

-- display_name devient l'identité : obligatoire une fois renseignée
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
-- de profil disparaît. Si tu veux une messagerie purement écrite, dis-le
-- et messages.photo_url part avec le bucket chat-photos.
-- ============================================================

comment on column public.profiles.display_name is
  'Prénom ou nom affiché. Remplace couple_name depuis le passage aux profils individuels.';


-- ┌────────────────────────────────────────────────────────
-- │ 20260823000400_compatibilite.sql
-- └────────────────────────────────────────────────────────

-- ============================================================
-- COMPATIBILITÉ INTELLECTUELLE
--
-- Seize questions, quatre thèmes, une échelle de 1 à 5.
-- Les réponses vivent dans une table à part, lisible par son seul
-- propriétaire : le score est calculé en base par des fonctions
-- security definer, et on expose un pourcentage, jamais un profil
-- psychologique. Une colonne sur profiles n'aurait pas tenu — la policy
-- profiles_select laisse lire la ligne entière des autres membres.
--
-- Le même calcul existe en JS (src/lib/compatibility.js) pour le mode
-- démo et les tests. Les deux doivent rester d'accord.
-- ============================================================

create table if not exists public.profile_traits (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  traits     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profile_traits enable row level security;

-- personne d'autre que soi ne lit ses réponses, pas même pour comparer :
-- la comparaison passe par compat_score, en security definer
create policy "profile_traits_own" on public.profile_traits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists profile_traits_updated_at on public.profile_traits;
create trigger profile_traits_updated_at
  before update on public.profile_traits
  for each row execute function public.set_updated_at();

-- lecture des réponses de n'importe qui, réservée aux fonctions internes
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
-- Sur chaque question répondue des deux côtés, l'accord vaut
-- 1 - écart/4. Les thèmes pèsent le même poids, pour qu'un thème très
-- rempli n'écrase pas les autres. En dessous de 8 réponses communes,
-- le score ne veut rien dire : on renvoie NULL.
-- ============================================================

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
      -- une valeur hors échelle ou non entière est ignorée, comme en JS
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
    -- coordonnées floutées à ~500m : on situe une personne dans un
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
    -- un score absent sans révéler une seule de ses réponses
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
create or replace function public.my_traits()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.traits_of(auth.uid());
$$;


-- ┌────────────────────────────────────────────────────────
-- │ 20260823000500_matches_entre_personnes.sql
-- └────────────────────────────────────────────────────────

-- ============================================================
-- LA TABLE MATCHES PARLE ENCORE DE COUPLES
--
-- couple_a / couple_b étaient les deux couples d'une connexion. Ce sont
-- désormais deux personnes : on renomme. Dernière trace structurelle du
-- modèle abandonné.
-- ============================================================

alter table public.matches rename column couple_a to member_a;
alter table public.matches rename column couple_b to member_b;

alter index if exists matches_a_idx rename to matches_member_a_idx;
alter index if exists matches_b_idx rename to matches_member_b_idx;

-- ============================================================
-- LES OBJETS QUI S'Y RÉFÈRENT
-- ============================================================

-- création automatique de la connexion réciproque
create or replace function public.create_match_if_mutual()
returns trigger language plpgsql security definer
set search_path = public as $$
declare a uuid; b uuid;
begin
  if exists (
    select 1 from public.likes
    where from_id = new.to_id and to_id = new.from_id
  ) then
    -- member_a < member_b : l'ordre garantit l'unicité sans doublon
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
    -- modification du contenu : expéditeur uniquement
    sender_id = auth.uid()
    -- ou mise à jour de read_at seule, contenu et photo inchangés
    or exists (
      select 1 from public.messages orig
      where orig.id = id
        and orig.content   is not distinct from content
        and orig.photo_url is not distinct from photo_url
    )
  );

-- la visibilité restreinte des profils s'appuyait aussi sur ces colonnes
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    auth.uid() is not null
    and not public.is_blocked(id)
    and (
      -- toujours voir son propre profil, même suspendu
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


-- ════════════════════════════════════════════════════════════
-- VÉRIFICATION — lis le résultat AVANT de valider
--
-- Attendu : les colonnes du mode couple à 0, les nouvelles tables
-- présentes, et un décompte de profils cohérent avec tes inscrits.
-- ════════════════════════════════════════════════════════════

select 'colonnes couple restantes' as controle,
       count(*)::text as valeur
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('couple_name','avatar_url','orientation','seeking','limits','email_2')

union all
select 'nouvelles tables', string_agg(table_name, ', ' order by table_name)
from information_schema.tables
where table_schema = 'public'
  and table_name in ('daily_words','word_responses','profile_answers','profile_traits')

union all
select 'mots du jour seedés', count(*)::text from public.daily_words

union all
select 'profils restants', count(*)::text from public.profiles

union all
select 'colonnes de matches', string_agg(column_name, ', ' order by column_name)
from information_schema.columns
where table_schema = 'public' and table_name = 'matches';

commit;

-- ════════════════════════════════════════════════════════════
-- Le commit ci-dessus clôt la transaction ouverte tout en haut.
--
-- Il n'y a pas de décision à prendre entre les deux : si une seule
-- instruction avait échoué, Postgres aurait avorté la transaction et
-- le commit n'aurait rien validé. Le résultat du SELECT s'affiche
-- pour contrôle, pas pour arbitrer.
--
-- Pour répéter sans rien valider : remplace ce commit par rollback,
-- lance, lis le contrôle — puis relance le script avec commit.
-- ════════════════════════════════════════════════════════════
