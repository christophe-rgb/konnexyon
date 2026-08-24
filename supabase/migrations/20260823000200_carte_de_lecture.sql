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
