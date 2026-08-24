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
-- Sur chaque question répondue des deux côtés, l'accord vaut
-- 1 - écart/4. Les thèmes pèsent le même poids, pour qu'un thème très
-- rempli n'écrase pas les autres. En dessous de 8 réponses communes,
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
