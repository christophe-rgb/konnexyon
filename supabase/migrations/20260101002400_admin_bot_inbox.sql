-- ============================================================
-- Boîte des bots (admin) : répondre à la place des bots
-- ============================================================

-- 1) Désactive l'auto-réponse : c'est l'admin qui répond à la main.
drop trigger if exists on_message_bot_reply on public.messages;

-- 2) Liste des conversations reçues par les bots (admin uniquement).
create or replace function public.admin_bot_threads()
returns table (
  match_id uuid,
  bot_id uuid, bot_name text, bot_avatar text,
  client_id uuid, client_name text, client_avatar text,
  last_message text, last_at timestamptz,
  unread_from_client int
)
language sql security definer set search_path = public as $$
  select
    m.id,
    b.id, b.couple_name, b.avatar_url,
    c.id, c.couple_name, c.avatar_url,
    lm.content, lm.created_at,
    (select count(*) from public.messages x
       where x.match_id = m.id and x.sender_id = c.id and x.read_at is null)::int
  from public.matches m
  join public.profiles b on (b.id = m.couple_a or b.id = m.couple_b) and b.is_bot
  join public.profiles c on (c.id = m.couple_a or c.id = m.couple_b) and not c.is_bot
  left join lateral (
    select content, created_at from public.messages
    where match_id = m.id order by created_at desc limit 1
  ) lm on true
  where public.is_admin()
  order by lm.created_at desc nulls last;
$$;
grant execute on function public.admin_bot_threads() to authenticated;

-- 3) Messages d'une conversation de bot (admin uniquement).
create or replace function public.admin_bot_messages(p_match_id uuid)
returns setof public.messages
language sql security definer set search_path = public as $$
  select * from public.messages
  where match_id = p_match_id and public.is_admin()
  order by created_at asc;
$$;
grant execute on function public.admin_bot_messages(uuid) to authenticated;

-- 4) Envoyer un message EN TANT QUE le bot du match (admin uniquement).
create or replace function public.admin_send_as_bot(p_match_id uuid, p_content text)
returns void language plpgsql security definer set search_path = public as $$
declare bot_id uuid;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if coalesce(btrim(p_content), '') = '' then return; end if;
  select p.id into bot_id
  from public.profiles p
  join public.matches m on (m.couple_a = p.id or m.couple_b = p.id)
  where m.id = p_match_id and p.is_bot
  limit 1;
  if bot_id is null then raise exception 'aucun bot dans ce match'; end if;
  insert into public.messages (match_id, sender_id, content)
  values (p_match_id, bot_id, p_content);
  -- marque comme lus les messages du client
  update public.messages set read_at = now()
  where match_id = p_match_id and sender_id <> bot_id and read_at is null;
end;
$$;
grant execute on function public.admin_send_as_bot(uuid, text) to authenticated;
