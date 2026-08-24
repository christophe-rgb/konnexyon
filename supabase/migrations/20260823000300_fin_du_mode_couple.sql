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
