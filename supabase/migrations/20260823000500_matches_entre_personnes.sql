-- ============================================================
-- LA TABLE MATCHES PARLE ENCORE DE COUPLES
--
-- couple_a / couple_b étaient les deux couples d'une connexion. Ce sont
-- désormais deux personnes : on renomme. Dernière trace structurelle du
-- modèle abandonné.
-- ============================================================

alter table public.matches rename column couple_a to member_a;
alter table public.matches rename column couple_b to member_b;

alter index if exists matches_a_idx rename to matches_member_a_idx;
alter index if exists matches_b_idx rename to matches_member_b_idx;

-- ============================================================
-- LES OBJETS QUI S'Y RÉFÈRENT
-- ============================================================

-- création automatique de la connexion réciproque
create or replace function public.create_match_if_mutual()
returns trigger language plpgsql security definer
set search_path = public as $$
declare a uuid; b uuid;
begin
  if exists (
    select 1 from public.likes
    where from_id = new.to_id and to_id = new.from_id
  ) then
    -- member_a < member_b : l'ordre garantit l'unicité sans doublon
    a := least(new.from_id, new.to_id);
    b := greatest(new.from_id, new.to_id);
    insert into public.matches (member_a, member_b) values (a, b)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.delete_match_on_unlike()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  delete from public.matches
  where member_a = least(old.from_id, old.to_id)
    and member_b = greatest(old.from_id, old.to_id);
  return old;
end;
$$;

-- fils de discussion
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
language sql stable security definer
set search_path = public as $$
  select distinct on (m.id)
    m.id as match_id,
    case when m.member_a = p_profile_id then m.member_b else m.member_a end as other_id,
    p.display_name,
    msg.content, msg.photo_url, msg.created_at, msg.sender_id, msg.read_at
  from public.matches m
  join public.profiles p
    on p.id = case when m.member_a = p_profile_id then m.member_b else m.member_a end
  left join lateral (
    select content, photo_url, created_at, sender_id, read_at
    from public.messages where match_id = m.id
    order by created_at desc limit 1
  ) msg on true
  where m.member_a = p_profile_id or m.member_b = p_profile_id
  order by m.id, msg.created_at desc nulls last;
$$;

grant execute on function public.get_message_threads(uuid) to authenticated;

-- ============================================================
-- LES POLICIES
-- ============================================================

drop policy if exists "matches_select" on public.matches;
create policy "matches_select" on public.matches
  for select using (member_a = auth.uid() or member_b = auth.uid());

drop policy if exists "matches_delete_own" on public.matches;
create policy "matches_delete_own" on public.matches
  for delete using (member_a = auth.uid() or member_b = auth.uid());

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.member_a = auth.uid() or m.member_b = auth.uid())
    )
    and not (auth.uid() = any(deleted_for))
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id and (m.member_a = auth.uid() or m.member_b = auth.uid())
    )
  );

drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages
  for update
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.member_a = auth.uid() or m.member_b = auth.uid())
    )
  )
  with check (
    -- modification du contenu : expéditeur uniquement
    sender_id = auth.uid()
    -- ou mise à jour de read_at seule, contenu et photo inchangés
    or exists (
      select 1 from public.messages orig
      where orig.id = id
        and orig.content   is not distinct from content
        and orig.photo_url is not distinct from photo_url
    )
  );

-- la visibilité restreinte des profils s'appuyait aussi sur ces colonnes
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    auth.uid() is not null
    and not public.is_blocked(id)
    and (
      -- toujours voir son propre profil, même suspendu
      id = auth.uid()
      or (
        status = 'active'
        and (
          visibility = 'public'
          or (
            visibility in ('matches_only', 'discreet')
            and exists (
              select 1 from public.matches
              where member_a = least(auth.uid(), id)
                and member_b = greatest(auth.uid(), id)
            )
          )
        )
      )
    )
  );
