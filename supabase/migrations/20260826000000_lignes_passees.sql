-- ============================================================
-- SE SOUVENIR DE CE QU ON A DEJA VU
--
-- Deux defauts se cumulaient :
--   - " plus tard " ne vivait que dans la memoire de la page, donc
--     les memes lignes revenaient a chaque rechargement ;
--   - la liste de lecture ignorait qui on avait deja connecte.
--
-- On distingue desormais les deux usages du meme jeu de donnees :
--   la PILE ne montre que ce qui reste a trancher ;
--   la LISTE montre tout, en signalant ce qui est deja connecte.
-- Lire la ligne de quelqu un qu on connait garde du sens ; la swiper
-- une seconde fois, non.
--
-- Les mises de cote sont rattachees au mot du jour, pas a une date :
-- elles s effacent donc d elles-memes quand le mot change.
-- ============================================================

create table if not exists public.word_passes (
  user_id       uuid not null references public.profiles(id)    on delete cascade,
  other_id      uuid not null references public.profiles(id)    on delete cascade,
  daily_word_id uuid not null references public.daily_words(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, other_id, daily_word_id)
);

alter table public.word_passes enable row level security;

create policy "word_passes_own" on public.word_passes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on public.word_passes to authenticated;

-- Mettre une ligne de cote pour aujourd hui.
create or replace function public.passer_ligne(p_other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_mot uuid;
begin
  if auth.uid() is null or p_other is null or p_other = auth.uid() then return; end if;

  select id into v_mot from public.daily_words
  where publish_date <= current_date order by publish_date desc limit 1;
  if v_mot is null then return; end if;

  insert into public.word_passes (user_id, other_id, daily_word_id)
  values (auth.uid(), p_other, v_mot)
  on conflict do nothing;
end;
$$;

grant execute on function public.passer_ligne(uuid) to authenticated;

-- ============================================================
-- LA LISTE DE LECTURE SAIT CE QU ON A DEJA FAIT
-- ============================================================

drop function if exists public.get_reading_list();

create or replace function public.get_reading_list()
returns table (
  user_id        uuid,
  display_name   text,
  age            smallint,
  city           text,
  line           text,
  created_at     timestamptz,
  distance_km    float,
  lng            float,
  lat            float,
  compatibility  smallint,
  deja_connecte  boolean,
  passe          boolean
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
    public.compat_score(public.traits_of(auth.uid()), public.traits_of(pr.id)) as compatibility,
    exists (
      select 1 from public.likes l
      where l.from_id = auth.uid() and l.to_id = r.user_id
    ) as deja_connecte,
    exists (
      select 1 from public.word_passes wp
      where wp.user_id = auth.uid()
        and wp.other_id = r.user_id
        and wp.daily_word_id = (select id from today)
    ) as passe
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
