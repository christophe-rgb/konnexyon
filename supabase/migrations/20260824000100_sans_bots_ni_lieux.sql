-- ============================================================
-- NI BOTS NI LIEUX LIBERTINS
--
-- Deux heritages du positionnement precedent s'en vont :
--   - les faux profils pilotes par le serveur (bot_autoreply,
--     admin_send_as_bot, colonne profiles.is_bot)
--   - l'annuaire de lieux libertins et sa prospection
--     (venues, venue_leads et leurs fonctions d'administration)
--
-- Au passage, on repare les lecteurs de messages chiffres : ils
-- referencaient matches.couple_a / couple_b, renommes en member_a /
-- member_b. Ces fonctions viennent du travail du 02/07 applique a la
-- base mais absent de cette branche - d'ou le renommage qui les avait
-- cassees sans qu'on les voie.
-- ============================================================

-- ============================================================
-- 1. FONCTIONS BOTS ET LIEUX
--
-- Suppression dynamique : leurs noms exacts et leurs signatures
-- viennent de migrations absentes d'ici, on les cible par motif
-- plutot que de les enumerer a l'aveugle.
-- ============================================================

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname ~* '(bot|venue|lieu|lead)'
  loop
    execute 'drop function if exists ' || f.signature || ' cascade';
  end loop;
end $$;

-- heritage du modele couple, sans emploi depuis le passage aux individus
drop function if exists public.disconnect_couple(uuid) cascade;

-- ============================================================
-- 2. TABLES ET COLONNES
-- ============================================================

drop table if exists public.venue_leads cascade;
drop table if exists public.venues      cascade;

alter table public.profiles drop column if exists is_bot cascade;

-- ============================================================
-- 3. LECTEURS DE MESSAGES CHIFFRES, REPARES
--
-- Le contenu n'est jamais stocke en clair : un trigger le chiffre a
-- l'insertion dans content_enc et vide content. La lecture passe donc
-- obligatoirement par ces fonctions, seules a connaitre la cle.
-- ============================================================

drop function if exists public.get_messages(uuid, timestamptz, int);

create or replace function public.get_messages(
  p_match_id uuid, p_before timestamptz default null, p_limit int default 50)
returns table (
  id uuid, match_id uuid, sender_id uuid, content text,
  photo_url text, photo_expires_at timestamptz, read_at timestamptz,
  deleted_for uuid[], created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.matches m
    where m.id = p_match_id and (m.member_a = auth.uid() or m.member_b = auth.uid())
  ) then raise exception 'not authorized'; end if;

  return query
    select msg.id, msg.match_id, msg.sender_id, public.dec_content(msg.content_enc),
           msg.photo_url, msg.photo_expires_at, msg.read_at, msg.deleted_for, msg.created_at
    from public.messages msg
    where msg.match_id = p_match_id
      and (msg.deleted_for is null or not (auth.uid() = any(msg.deleted_for)))
      and (p_before is null or msg.created_at < p_before)
    order by msg.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 100));
end $$;
grant execute on function public.get_messages(uuid, timestamptz, int) to authenticated;

drop function if exists public.get_message(uuid);

create or replace function public.get_message(p_id uuid)
returns table (
  id uuid, match_id uuid, sender_id uuid, content text,
  photo_url text, photo_expires_at timestamptz, read_at timestamptz,
  deleted_for uuid[], created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select msg.id, msg.match_id, msg.sender_id, public.dec_content(msg.content_enc),
           msg.photo_url, msg.photo_expires_at, msg.read_at, msg.deleted_for, msg.created_at
    from public.messages msg
    join public.matches m on m.id = msg.match_id
    where msg.id = p_id and (m.member_a = auth.uid() or m.member_b = auth.uid());
end $$;
grant execute on function public.get_message(uuid) to authenticated;

drop function if exists public.get_last_message(uuid);

create or replace function public.get_last_message(p_match_id uuid)
returns table (content text, photo_url text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.matches m
    where m.id = p_match_id and (m.member_a = auth.uid() or m.member_b = auth.uid())
  ) then return; end if;
  return query
    select public.dec_content(msg.content_enc), msg.photo_url, msg.created_at
    from public.messages msg
    where msg.match_id = p_match_id
    order by msg.created_at desc
    limit 1;
end $$;
grant execute on function public.get_last_message(uuid) to authenticated;

-- ============================================================
-- 4. APERCU DES FILS : il renvoyait content, toujours vide depuis
--    le chiffrement. Il dechiffre desormais comme les autres.
-- ============================================================

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
language sql stable security definer set search_path = public as $$
  select distinct on (m.id)
    m.id as match_id,
    case when m.member_a = p_profile_id then m.member_b else m.member_a end as other_id,
    p.display_name,
    public.dec_content(msg.content_enc),
    msg.photo_url, msg.created_at, msg.sender_id, msg.read_at
  from public.matches m
  join public.profiles p
    on p.id = case when m.member_a = p_profile_id then m.member_b else m.member_a end
  left join lateral (
    select content_enc, photo_url, created_at, sender_id, read_at
    from public.messages where match_id = m.id
    order by created_at desc limit 1
  ) msg on true
  where m.member_a = p_profile_id or m.member_b = p_profile_id
  order by m.id, msg.created_at desc nulls last;
$$;
grant execute on function public.get_message_threads(uuid) to authenticated;
