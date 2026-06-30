-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";        -- suppression auto photos chat
create extension if not exists "postgis";        -- géolocalisation

-- ============================================================
-- ENUMS
-- ============================================================
create type couple_orientation as enum (
  'hetero_hetero',
  'hetero_bi',
  'bi_all'
);

create type looking_for_type as enum (
  'couple',
  'man',
  'woman'
);

create type profile_visibility as enum (
  'public',
  'matches_only',
  'discreet'
);

create type profile_status as enum (
  'active',
  'inactive',
  'suspended',
  'deleted'
);

create type report_status as enum (
  'pending',
  'warned',
  'suspended',
  'dismissed',
  'banned'
);

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  couple_name     text not null check (char_length(couple_name) between 2 and 50),
  bio             text check (char_length(bio) <= 300),
  avatar_url      text,

  -- identité du couple
  orientation     couple_orientation not null default 'hetero_hetero',
  looking_for     looking_for_type[] not null default '{couple}',

  -- onboarding
  seeking         text[]   default '{}',   -- rencontres_occasionnelles, echangisme, amis_libertins, decouverte
  availabilities  text[]   default '{}',   -- semaine, weekend, rdv, spontanement
  limits          text[]   default '{}',   -- pas_photo, discretion, pas_contact_hors_site, preservatif
  max_distance_km integer  default 50,

  -- visibilité & statut
  visibility      profile_visibility not null default 'public',
  status          profile_status not null default 'active',
  hide_location   boolean not null default false,

  -- géolocalisation (point PostGIS)
  location        geography(point, 4326),
  location_updated_at timestamptz,

  -- double confirmation email couple
  email_1         text not null,
  email_2         text,
  email_1_confirmed boolean not null default false,
  email_2_confirmed boolean not null default false,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- index spatial pour les requêtes de proximité
create index profiles_location_idx on public.profiles using gist(location);
create index profiles_status_idx on public.profiles(status);
create index profiles_visibility_idx on public.profiles(visibility);

-- ============================================================
-- LIKES
-- ============================================================
create table public.likes (
  id          uuid primary key default uuid_generate_v4(),
  from_id     uuid not null references public.profiles(id) on delete cascade,
  to_id       uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(from_id, to_id)
);

create index likes_from_idx on public.likes(from_id);
create index likes_to_idx   on public.likes(to_id);

-- ============================================================
-- MATCHES  (like mutuel)
-- ============================================================
create table public.matches (
  id          uuid primary key default uuid_generate_v4(),
  couple_a    uuid not null references public.profiles(id) on delete cascade,
  couple_b    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (couple_a < couple_b),  -- unicité sans doublon
  unique(couple_a, couple_b)
);

create index matches_a_idx on public.matches(couple_a);
create index matches_b_idx on public.matches(couple_b);

-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id          uuid primary key default uuid_generate_v4(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  content     text,                    -- null si photo uniquement
  photo_url   text,                    -- supprimé après 7j
  photo_expires_at timestamptz,        -- = created_at + 7 days
  read_at     timestamptz,
  deleted_for uuid[] default '{}',     -- ids qui ont supprimé le message (pour eux)
  created_at  timestamptz not null default now()
);

create index messages_match_idx    on public.messages(match_id);
create index messages_expires_idx  on public.messages(photo_expires_at) where photo_url is not null;

-- ============================================================
-- BLOCKS
-- ============================================================
create table public.blocks (
  id          uuid primary key default uuid_generate_v4(),
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(blocker_id, blocked_id)
);

create index blocks_blocker_idx on public.blocks(blocker_id);
create index blocks_blocked_idx on public.blocks(blocked_id);

-- ============================================================
-- REPORTS (signalements)
-- ============================================================
create table public.reports (
  id            uuid primary key default uuid_generate_v4(),
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  reported_id   uuid not null references public.profiles(id) on delete cascade,
  reason        text not null check (char_length(reason) between 5 and 500),
  status        report_status not null default 'pending',
  admin_note    text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create index reports_status_idx on public.reports(status);

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- MATCH AUTO-CREATE  (trigger sur likes)
-- ============================================================
create or replace function public.create_match_if_mutual()
returns trigger language plpgsql security definer as $$
declare
  a uuid;
  b uuid;
begin
  -- vérifier si le like inverse existe
  if exists (
    select 1 from public.likes
    where from_id = new.to_id and to_id = new.from_id
  ) then
    -- toujours stocker couple_a < couple_b pour respecter la contrainte unique
    a := least(new.from_id, new.to_id);
    b := greatest(new.from_id, new.to_id);

    insert into public.matches (couple_a, couple_b)
    values (a, b)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_like_inserted
  after insert on public.likes
  for each row execute function public.create_match_if_mutual();

-- ============================================================
-- MATCH DELETE on unlike
-- ============================================================
create or replace function public.delete_match_on_unlike()
returns trigger language plpgsql security definer as $$
begin
  delete from public.matches
  where (couple_a = least(old.from_id, old.to_id)
     and couple_b = greatest(old.from_id, old.to_id));
  return old;
end;
$$;

create trigger on_like_deleted
  after delete on public.likes
  for each row execute function public.delete_match_on_unlike();

-- ============================================================
-- PHOTO EXPIRY — cron job (pg_cron, tourne toutes les heures)
-- ============================================================
-- Note : le cron efface les références en DB mais pas les fichiers dans storage.
-- Pour supprimer les fichiers Storage, utiliser une Edge Function dédiée déclenchée par ce cron,
-- ou utiliser les Storage Lifecycle Rules dans le dashboard Supabase (bucket chat-photos TTL 7j).
-- La suppression DB seule empêche l'affichage — les fichiers orphelins dans Storage
-- doivent être nettoyés via une règle de rétention côté Supabase Storage.
select cron.schedule(
  'delete-expired-photos',
  '0 * * * *',
  $$
    update public.messages
    set photo_url = null, photo_expires_at = null
    where photo_expires_at < now() and photo_url is not null;
  $$
);

-- ============================================================
-- CONFIRMATION PARTENAIRE 2
-- ============================================================
create table public.partner_confirmations (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  token        text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at   timestamptz not null default now() + interval '7 days',
  confirmed_at timestamptz,
  created_at   timestamptz not null default now()
);

create index partner_confirmations_token_idx on public.partner_confirmations(token);
create index partner_confirmations_profile_idx on public.partner_confirmations(profile_id);

-- RLS : aucun accès direct client. La validation passe exclusivement par la RPC
-- confirm_partner_token (security definer) ; les inserts par le service_role
-- (Edge Function) contournent la RLS. Pas de policy = pas d'accès direct.
alter table public.partner_confirmations enable row level security;

-- fonction de validation du token
create or replace function public.confirm_partner_token(p_token text)
returns json language plpgsql security definer as $$
declare
  rec public.partner_confirmations;
begin
  select * into rec
  from public.partner_confirmations
  where token = p_token
    and confirmed_at is null
    and expires_at > now();

  if not found then
    return json_build_object('success', false, 'error', 'Token invalide ou expiré');
  end if;

  -- marquer comme confirmé
  update public.partner_confirmations
  set confirmed_at = now()
  where id = rec.id;

  -- mettre à jour le profil
  update public.profiles
  set email_2_confirmed = true
  where id = rec.profile_id;

  return json_build_object('success', true);
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.likes    enable row level security;
alter table public.matches  enable row level security;
alter table public.messages enable row level security;
alter table public.blocks   enable row level security;
alter table public.reports  enable row level security;

-- helper : admin check (stocker le rôle dans app_metadata côté Supabase Auth)
-- suppression d'un message pour soi-même uniquement.
-- Le user_id fourni est ignoré : on force auth.uid() et on vérifie l'appartenance
-- au match (empêche de supprimer un message "chez" l'autre membre).
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

create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- helper : est-ce que je suis dans ce match ?
create or replace function public.is_match_member(match_row public.matches)
returns boolean language sql security definer as $$
  select match_row.couple_a = auth.uid() or match_row.couple_b = auth.uid();
$$;

-- helper : est-ce que X m'a bloqué ou je l'ai bloqué ?
create or replace function public.is_blocked(other_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = other_id)
       or (blocker_id = other_id and blocked_id = auth.uid())
  );
$$;

-- ── PROFILES ──────────────────────────────────────────────────

-- Logique de visibilité déportée dans une fonction SECURITY DEFINER pour éviter
-- la récursion RLS (un upsert évaluait profiles_select via RETURNING * en même
-- temps que la policy UPDATE → "infinite recursion detected").
-- Visible si : status=active, pas de blocage mutuel, et (mon profil OU public
-- OU matches_only avec match existant).
create or replace function public.profile_is_visible(
  p_id uuid, p_status text, p_visibility text
)
returns boolean language sql stable security definer set search_path = public as $$
  select
    auth.uid() is not null
    and p_status = 'active'
    and not exists (
      select 1 from public.blocks
      where (blocker_id = auth.uid() and blocked_id = p_id)
         or (blocker_id = p_id       and blocked_id = auth.uid())
    )
    and (
      p_id = auth.uid()
      or p_visibility = 'public'
      or (
        p_visibility = 'matches_only'
        and exists (
          select 1 from public.matches
          where couple_a = least(auth.uid(), p_id)
            and couple_b = greatest(auth.uid(), p_id)
        )
      )
    );
$$;

create policy "profiles_select" on public.profiles
  for select using (public.profile_is_visible(id, status::text, visibility::text));

-- mode discret : profil visible uniquement par soi-même et ses matchs
-- (la policy ci-dessus couvre déjà ce cas ; discreet = invisible pour public)

create policy "profiles_insert" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Verrou des colonnes monétisées / statut : seul service_role peut les changer.
-- (une policy RLS ne peut pas comparer NEW vs OLD → trigger BEFORE UPDATE)
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

drop trigger if exists trg_lock_sensitive_profile_columns on public.profiles;
create trigger trg_lock_sensitive_profile_columns
  before update on public.profiles
  for each row
  execute function public.lock_sensitive_profile_columns();

-- ── LIKES ─────────────────────────────────────────────────────

-- on ne voit que ses propres likes envoyés (les reçus sont invisibles avant match)
create policy "likes_select" on public.likes
  for select using (from_id = auth.uid());

create policy "likes_insert" on public.likes
  for insert with check (
    from_id = auth.uid()
    and not public.is_blocked(to_id)
  );

create policy "likes_delete" on public.likes
  for delete using (from_id = auth.uid());

-- ── MATCHES ───────────────────────────────────────────────────

create policy "matches_select" on public.matches
  for select using (couple_a = auth.uid() or couple_b = auth.uid());

-- les matchs sont créés uniquement par le trigger (security definer), pas par le client

-- ── MESSAGES ──────────────────────────────────────────────────

create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.couple_a = auth.uid() or m.couple_b = auth.uid())
    )
    and not (auth.uid() = any(deleted_for))
  );

create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.couple_a = auth.uid() or m.couple_b = auth.uid())
    )
  );

-- update restreint à l'auteur du message (empêche de réécrire les messages de
-- l'autre membre). Le marquage "lu" passe par la RPC mark_messages_read.
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

-- ── BLOCKS ────────────────────────────────────────────────────

create policy "blocks_select" on public.blocks
  for select using (blocker_id = auth.uid() or blocked_id = auth.uid());

create policy "blocks_insert" on public.blocks
  for insert with check (blocker_id = auth.uid());

create policy "blocks_delete" on public.blocks
  for delete using (blocker_id = auth.uid());

-- ── REPORTS ───────────────────────────────────────────────────

create policy "reports_insert" on public.reports
  for insert with check (reporter_id = auth.uid());

create policy "reports_select_own" on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());

create policy "reports_update_admin" on public.reports
  for update using (public.is_admin());

-- ── ADMIN : accès total ───────────────────────────────────────

create policy "admin_all_profiles" on public.profiles
  for all using (public.is_admin());

create policy "admin_all_reports" on public.reports
  for all using (public.is_admin());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- À créer dans le dashboard Supabase (ou via migration storage) :
--
-- bucket: "avatars"
--   • public: false
--   • file size limit: 5MB
--   • allowed types: image/jpeg, image/png, image/webp
--
-- bucket: "chat-photos"
--   • public: false
--   • file size limit: 10MB
--   • allowed types: image/jpeg, image/png, image/webp
--   • TTL géré par le cron job ci-dessus

-- ============================================================
-- FONCTION : profils compatibles proches (Page Découverte)
-- ============================================================
create or replace function public.get_nearby_compatible_profiles(
  radius_km integer default 50
)
returns table (
  id            uuid,
  couple_name   text,
  bio           text,
  avatar_url    text,
  orientation   couple_orientation,
  looking_for   looking_for_type[],
  seeking       text[],
  distance_km   float,
  lng           float,
  lat           float
)
language sql security definer as $$
  select
    p.id,
    p.couple_name,
    p.bio,
    p.avatar_url,
    p.orientation,
    p.looking_for,
    p.seeking,
    round((st_distance(p.location, me.location) / 1000)::numeric, 0)::float as distance_km,
    -- coordonnées floutées à ~500m (0.005 degrés ≈ 550m)
    round((st_x(p.location::geometry) + (random() - 0.5) * 0.005)::numeric, 5)::float as lng,
    round((st_y(p.location::geometry) + (random() - 0.5) * 0.005)::numeric, 5)::float as lat
  from public.profiles p
  cross join (
    select location from public.profiles where id = auth.uid()
  ) me
  where
    p.id <> auth.uid()
    and p.status = 'active'
    and p.visibility in ('public')
    and p.hide_location = false
    and not public.is_blocked(p.id)
    -- filtre distance
    and st_distance(p.location, me.location) <= (radius_km * 1000)
    -- filtre compatibilité (orientations croisées)
    and (
      -- les deux hétéro
      (p.orientation = 'hetero_hetero' and (
        select orientation from public.profiles where id = auth.uid()
      ) in ('hetero_hetero', 'hetero_bi', 'bi_all'))
      or
      p.orientation = 'bi_all'
      or
      (select orientation from public.profiles where id = auth.uid()) = 'bi_all'
    )
    -- pas encore liké (pour ne pas réafficher)
    and not exists (
      select 1 from public.likes l
      where l.from_id = auth.uid() and l.to_id = p.id
    )
  order by distance_km asc;
$$;

-- ============================================================
-- FONCTIONS : positions pour la carte
-- ============================================================
-- Ma propre position (marqueur "Vous"). Utilisée par Discover et le backfill.
create or replace function public.get_my_location()
returns table (lat float, lng float)
language sql security definer set search_path = public as $$
  select st_y(location::geometry)::float as lat,
         st_x(location::geometry)::float as lng
  from public.profiles
  where id = auth.uid() and location is not null;
$$;
grant execute on function public.get_my_location() to authenticated;

-- Positions des couples matchés (page Matchs), coordonnées floutées (~500 m).
-- N'expose que les couples réellement matchés avec l'appelant.
create or replace function public.get_match_locations(profile_ids uuid[])
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
