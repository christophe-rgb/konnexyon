-- ============================================================
-- Matching symétrique + cycle de vie du match + Realtime + idempotence Stripe
-- ============================================================

-- 1) MATCHING SYMÉTRIQUE — l'orientation devient une info, plus un filtre.
-- Avant, un couple hetero_bi n'apparaissait qu'aux viewers bi_all (catalogue
-- amputé, asymétrique). On retire la clause d'orientation : tout couple actif,
-- public, dans le rayon et non liké/bloqué est proposé.
-- drop nécessaire : on change le type de retour (ajout colonne `liked`)
drop function if exists public.get_nearby_compatible_profiles(integer);
create function public.get_nearby_compatible_profiles(
  radius_km integer default 50
)
returns table (
  id uuid, couple_name text, bio text, avatar_url text,
  orientation couple_orientation, looking_for looking_for_type[],
  seeking text[], distance_km float, lng float, lat float, liked boolean
)
language sql security definer set search_path = public as $$
  select
    p.id, p.couple_name, p.bio, p.avatar_url, p.orientation, p.looking_for, p.seeking,
    round((st_distance(p.location, me.location) / 1000)::numeric, 0)::float as distance_km,
    round((st_x(p.location::geometry) + (random() - 0.5) * 0.005)::numeric, 5)::float as lng,
    round((st_y(p.location::geometry) + (random() - 0.5) * 0.005)::numeric, 5)::float as lat,
    -- les couples déjà contactés ne sont PAS exclus : on les garde sur la carte,
    -- marqués via ce drapeau (mais on les retire de la pile de swipe côté client)
    exists (select 1 from public.likes l where l.from_id = auth.uid() and l.to_id = p.id) as liked
  from public.profiles p
  cross join (select location from public.profiles where id = auth.uid()) me
  where p.id <> auth.uid()
    and p.status = 'active'
    and p.visibility in ('public')
    and p.hide_location = false
    and not public.is_blocked(p.id)
    and st_distance(p.location, me.location) <= (radius_km * 1000)
  order by distance_km asc;
$$;

-- 2) UNMATCH — retirer un like ne détruit plus le match/conversation.
-- C'est désormais le BLOCAGE qui supprime le match (et ses messages en cascade).
drop trigger if exists on_like_deleted on public.likes;
drop function if exists public.delete_match_on_unlike();

create or replace function public.delete_match_on_block()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.matches
  where couple_a = least(new.blocker_id, new.blocked_id)
    and couple_b = greatest(new.blocker_id, new.blocked_id);
  return new;
end;
$$;

drop trigger if exists on_block_inserted on public.blocks;
create trigger on_block_inserted
  after insert on public.blocks
  for each row execute function public.delete_match_on_block();

-- 3) REALTIME — REPLICA IDENTITY FULL pour que la RLS s'applique correctement
-- aux events postgres_changes (messages_select référence match_id et deleted_for,
-- colonnes non-PK). Sans ça l'autorisation Realtime est évaluée sur une ligne
-- partielle → fuite/perte non garanties.
alter table public.messages replica identity full;
alter table public.matches  replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; end $$;

-- 4) IDEMPOTENCE STRIPE — table de déduplication des events webhook.
create table if not exists public.stripe_events (
  id          text primary key,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
-- Aucune policy : seul le service_role (webhook) y accède.
