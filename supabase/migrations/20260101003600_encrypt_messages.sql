-- ============================================================
-- Chiffrement des messages « au repos » (côté serveur)
-- ------------------------------------------------------------
-- Le contenu texte des messages n'est plus stocké en clair : il est chiffré
-- (pgcrypto / AES via pgp_sym) dans la colonne `content_enc`. La colonne
-- `content` en clair est vidée. Le déchiffrement se fait UNIQUEMENT côté serveur,
-- dans des fonctions SECURITY DEFINER (le client ne connaît jamais la clé).
--   • Écriture : un trigger chiffre automatiquement → aucun changement d'insert.
--   • Lecture : RPC dédiées qui déchiffrent (membres du match / admin).
--   • Bots & modération : conservés (le serveur peut déchiffrer).
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ── Clé secrète (jamais lisible par les clients) ────────────
create table if not exists public.app_secret (
  id      int primary key default 1,
  msg_key text not null
);
alter table public.app_secret enable row level security;  -- aucune policy => deny all
revoke all on public.app_secret from anon, authenticated;

do $$
begin
  if not exists (select 1 from public.app_secret where id = 1) then
    insert into public.app_secret (id, msg_key)
    values (1, encode(extensions.gen_random_bytes(32), 'hex'));
  end if;
end $$;

create or replace function public.msg_key()
returns text language sql security definer set search_path = public as $$
  select msg_key from public.app_secret where id = 1
$$;
revoke all on function public.msg_key() from anon, authenticated;

-- ── Helpers chiffrer / déchiffrer (réservés au serveur) ─────
create or replace function public.enc_content(t text)
returns bytea language sql security definer set search_path = public, extensions as $$
  select case when t is null or btrim(t) = '' then null
              else pgp_sym_encrypt(t, public.msg_key()) end
$$;
revoke all on function public.enc_content(text) from anon, authenticated;

create or replace function public.dec_content(b bytea)
returns text language sql security definer set search_path = public, extensions as $$
  select case when b is null then null
              else pgp_sym_decrypt(b, public.msg_key()) end
$$;
revoke all on function public.dec_content(bytea) from anon, authenticated;

-- ── Colonne chiffrée + migration de l'existant ──────────────
alter table public.messages add column if not exists content_enc bytea;

update public.messages
   set content_enc = public.enc_content(content)
 where content is not null and content_enc is null;

-- ── Trigger : chiffre à l'insertion et vide le clair ────────
create or replace function public.messages_encrypt()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.content is not null then
    NEW.content_enc := public.enc_content(NEW.content);
    NEW.content := null;          -- plus aucun texte en clair stocké
  end if;
  return NEW;
end $$;

drop trigger if exists trg_messages_encrypt on public.messages;
create trigger trg_messages_encrypt
  before insert on public.messages
  for each row execute function public.messages_encrypt();

-- On vide le clair déjà migré.
update public.messages set content = null where content is not null and content_enc is not null;

-- ============================================================
-- Lectures déchiffrées
-- ============================================================

-- Messages d'une conversation (membre du match), pagination descendante.
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
    where m.id = p_match_id and (m.couple_a = auth.uid() or m.couple_b = auth.uid())
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

-- Un message déchiffré (utilisé au temps réel pour éviter le clair sur le fil).
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
    where msg.id = p_id and (m.couple_a = auth.uid() or m.couple_b = auth.uid());
end $$;
grant execute on function public.get_message(uuid) to authenticated;

-- Dernier message déchiffré (aperçu des connexions).
create or replace function public.get_last_message(p_match_id uuid)
returns table (content text, photo_url text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.matches m
    where m.id = p_match_id and (m.couple_a = auth.uid() or m.couple_b = auth.uid())
  ) then return; end if;
  return query
    select public.dec_content(msg.content_enc), msg.photo_url, msg.created_at
    from public.messages msg
    where msg.match_id = p_match_id
    order by msg.created_at desc
    limit 1;
end $$;
grant execute on function public.get_last_message(uuid) to authenticated;

-- ── Mise à jour des RPC existantes pour déchiffrer ──────────
CREATE OR REPLACE FUNCTION get_message_threads(p_profile_id uuid)
RETURNS TABLE (
  match_id uuid, other_id uuid, couple_name text, avatar_url text,
  content text, photo_url text, created_at timestamptz, sender_id uuid, read_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (m.id)
    m.id,
    CASE WHEN m.couple_a = p_profile_id THEN m.couple_b ELSE m.couple_a END,
    p.couple_name, p.avatar_url,
    public.dec_content(msg.content_enc), msg.photo_url, msg.created_at, msg.sender_id, msg.read_at
  FROM matches m
  JOIN profiles p ON p.id = CASE WHEN m.couple_a = p_profile_id THEN m.couple_b ELSE m.couple_a END
  LEFT JOIN LATERAL (
    SELECT content_enc, photo_url, created_at, sender_id, read_at
    FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1
  ) msg ON TRUE
  WHERE m.couple_a = p_profile_id OR m.couple_b = p_profile_id
  ORDER BY m.id, msg.created_at DESC NULLS LAST;
$$;
GRANT EXECUTE ON FUNCTION get_message_threads(uuid) TO authenticated;

-- Bots (admin) : threads + messages déchiffrés.
create or replace function public.admin_bot_threads()
returns table (
  match_id uuid, bot_id uuid, bot_name text, bot_avatar text,
  client_id uuid, client_name text, client_avatar text,
  last_message text, last_at timestamptz, unread_from_client int)
language sql security definer set search_path = public as $$
  select
    m.id, b.id, b.couple_name, b.avatar_url, c.id, c.couple_name, c.avatar_url,
    public.dec_content(lm.content_enc), lm.created_at,
    (select count(*) from public.messages x
       where x.match_id = m.id and x.sender_id = c.id and x.read_at is null)::int
  from public.matches m
  join public.profiles b on (b.id = m.couple_a or b.id = m.couple_b) and b.is_bot
  join public.profiles c on (c.id = m.couple_a or c.id = m.couple_b) and not c.is_bot
  left join lateral (
    select content_enc, created_at from public.messages
    where match_id = m.id order by created_at desc limit 1
  ) lm on true
  where public.is_admin()
  order by lm.created_at desc nulls last;
$$;
grant execute on function public.admin_bot_threads() to authenticated;

-- (le type de retour change : setof messages → table déchiffrée) → drop d'abord
drop function if exists public.admin_bot_messages(uuid);
create or replace function public.admin_bot_messages(p_match_id uuid)
returns table (
  id uuid, match_id uuid, sender_id uuid, content text,
  photo_url text, photo_expires_at timestamptz, read_at timestamptz,
  deleted_for uuid[], created_at timestamptz)
language sql security definer set search_path = public as $$
  select msg.id, msg.match_id, msg.sender_id, public.dec_content(msg.content_enc),
         msg.photo_url, msg.photo_expires_at, msg.read_at, msg.deleted_for, msg.created_at
  from public.messages msg
  where msg.match_id = p_match_id and public.is_admin()
  order by msg.created_at asc;
$$;
grant execute on function public.admin_bot_messages(uuid) to authenticated;
