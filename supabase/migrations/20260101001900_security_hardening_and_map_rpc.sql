-- ============================================================
-- Durcissement sécurité + RPC carte manquantes
-- ============================================================
-- Corrige plusieurs failles identifiées à l'audit et fournit les RPC
-- appelées par le front mais absentes du schéma (carte cassée sinon).

-- ── RPC carte : ma position (marqueur "Vous") ────────────────
-- Discover.jsx / auth.js (backfill) appellent get_my_location().
drop function if exists public.get_my_location();
create function public.get_my_location()
returns table (lat float, lng float)
language sql security definer set search_path = public as $$
  select st_y(location::geometry)::float as lat,
         st_x(location::geometry)::float as lng
  from public.profiles
  where id = auth.uid() and location is not null;
$$;
grant execute on function public.get_my_location() to authenticated;

-- ── RPC carte : positions des matchs (page Matchs) ───────────
-- N'expose QUE les couples réellement matchés avec l'appelant, coordonnées floutées (~500 m).
drop function if exists public.get_match_locations(uuid[]);
create function public.get_match_locations(profile_ids uuid[])
returns table (id uuid, couple_name text, avatar_url text, lat float, lng float)
language sql security definer set search_path = public as $$
  select p.id, p.couple_name, p.avatar_url,
         round((st_y(p.location::geometry) + (random() - 0.5) * 0.005)::numeric, 5)::float as lat,
         round((st_x(p.location::geometry) + (random() - 0.5) * 0.005)::numeric, 5)::float as lng
  from public.profiles p
  where p.id = any(profile_ids)
    and p.location is not null
    and exists (
      select 1 from public.matches m
      where m.couple_a = least(auth.uid(), p.id)
        and m.couple_b = greatest(auth.uid(), p.id)
    );
$$;
grant execute on function public.get_match_locations(uuid[]) to authenticated;

-- ── partner_confirmations : retirer l'accès direct ouvert ────
-- Les policies "using (true)" exposaient TOUS les tokens en lecture/écriture à
-- n'importe quel authentifié. La validation passe uniquement par la RPC
-- confirm_partner_token (security definer) ; les inserts par le service_role
-- (Edge Function) contournent la RLS. On supprime donc tout accès direct.
drop policy if exists "partner_confirm_select" on public.partner_confirmations;
drop policy if exists "partner_confirm_update" on public.partner_confirmations;

-- ── delete_message_for_user : ignorer le user_id fourni ──────
-- L'ancienne version acceptait un user_id arbitraire → on pouvait supprimer un
-- message "chez" l'autre membre. On force auth.uid() et on vérifie l'appartenance
-- au match. La signature est conservée pour compatibilité (param ignoré).
create or replace function public.delete_message_for_user(message_id uuid, user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.messages msg
  set deleted_for = array_append(coalesce(deleted_for, '{}'), auth.uid())
  where msg.id = message_id
    and not (auth.uid() = any(coalesce(deleted_for, '{}')))
    and exists (
      select 1 from public.matches m
      where m.id = msg.match_id
        and (m.couple_a = auth.uid() or m.couple_b = auth.uid())
    );
end;
$$;

-- ── messages_update : restreindre au propriétaire ────────────
-- L'ancienne policy autorisait tout membre du match à modifier N'IMPORTE quel
-- message (y compris réécrire le contenu de l'autre). On la limite à l'auteur,
-- et on déplace le marquage "lu" dans une RPC dédiée.
drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages
  for update using (sender_id = auth.uid()) with check (sender_id = auth.uid());

create or replace function public.mark_messages_read(p_match_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.messages
  set read_at = now()
  where match_id = p_match_id
    and sender_id <> auth.uid()
    and read_at is null
    and exists (
      select 1 from public.matches m
      where m.id = p_match_id
        and (m.couple_a = auth.uid() or m.couple_b = auth.uid())
    );
$$;
grant execute on function public.mark_messages_read(uuid) to authenticated;
