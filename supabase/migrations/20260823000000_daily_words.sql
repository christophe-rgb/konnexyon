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

-- Le mot du jour. Prend le plus récent déjà publié plutôt qu'une égalité
-- stricte sur current_date : un trou dans le calendrier ne casse pas
-- l'écran, il prolonge simplement le mot de la veille.
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
-- Journée calée sur Europe/Paris : le compteur se remet à zéro à minuit
-- heure française, pas à 2h du matin comme le ferait un date_trunc UTC.
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
-- En security definer pour ne pas dépendre de la policy SELECT de profiles :
-- un membre en visibilité 'discreet' verrait sinon sa ligne disparaître de
-- la pile faute de pouvoir lire son couple_name. Les exclusions (soi-même,
-- bloqués, déjà connectés) restent appliquées ici explicitement.
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
