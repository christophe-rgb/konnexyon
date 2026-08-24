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

-- Une page de profil : l'identité, les quatre réponses, la dernière
-- ligne écrite. En security definer pour rester lisible quelle que
-- soit la visibilité héritée de l'ancien modèle.
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
