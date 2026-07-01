-- ============================================================
-- Rubrique "Lieux" : annuaire des lieux partenaires (clubs, saunas, sex-shops)
-- ============================================================

create table if not exists public.venues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null default 'club',   -- club | sauna | sexshop | bar | autre
  city        text,
  address     text,
  description text,
  website     text,
  phone       text,
  photo_url   text,
  location    geography(Point, 4326),
  status      text not null default 'hidden',  -- active (public) | hidden
  featured    boolean not null default false,  -- mise en avant (Premium)
  prospect_status text not null default 'a_contacter', -- a_contacter | contacte | accepte | refuse
  contacted_at    timestamptz,
  created_at  timestamptz not null default now()
);

-- colonnes ajoutées (si la table existait déjà)
alter table public.venues add column if not exists prospect_status text not null default 'a_contacter';
alter table public.venues add column if not exists contacted_at timestamptz;

alter table public.venues enable row level security;

-- Lecture publique des lieux actifs (annuaire visible de tous, même non connecté).
drop policy if exists venues_select on public.venues;
create policy venues_select on public.venues
  for select using (status = 'active' or public.is_admin());

-- Écriture réservée à l'admin.
drop policy if exists venues_admin_write on public.venues;
create policy venues_admin_write on public.venues
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.venues to anon, authenticated;
grant insert, update, delete on public.venues to authenticated;  -- RLS limite à l'admin

-- Liste des lieux (avec lat/lng pour la carte) — accessible à tous.
create or replace function public.get_venues()
returns table (
  id uuid, name text, type text, city text, address text,
  description text, website text, phone text, photo_url text,
  featured boolean, lng float, lat float
)
language sql security definer set search_path = public as $$
  select v.id, v.name, v.type, v.city, v.address, v.description, v.website, v.phone, v.photo_url,
         v.featured,
         st_x(v.location::geometry)::float, st_y(v.location::geometry)::float
  from public.venues v
  where v.status = 'active'
  order by v.featured desc, v.name asc;
$$;
grant execute on function public.get_venues() to anon, authenticated;

-- Créer / modifier un lieu (admin). Construit la position depuis lat/lng.
create or replace function public.admin_save_venue(
  p_id uuid, p_name text, p_type text, p_city text, p_address text,
  p_description text, p_website text, p_phone text, p_photo_url text,
  p_featured boolean, p_lat float, p_lng float
) returns uuid language plpgsql security definer set search_path = public as $$
declare vid uuid;
  loc geography := case when p_lat is not null and p_lng is not null
                       then ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326) end;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'nom requis'; end if;
  if p_id is null then
    insert into public.venues (name, type, city, address, description, website, phone, photo_url, featured, location)
    values (p_name, coalesce(p_type,'club'), p_city, p_address, p_description, p_website, p_phone, p_photo_url, coalesce(p_featured,false), loc)
    returning id into vid;
  else
    update public.venues set
      name = p_name, type = coalesce(p_type,'club'), city = p_city, address = p_address,
      description = p_description, website = p_website, phone = p_phone,
      photo_url = p_photo_url, featured = coalesce(p_featured,false),
      location = coalesce(loc, location)
    where id = p_id
    returning id into vid;
  end if;
  return vid;
end;
$$;
grant execute on function public.admin_save_venue(uuid, text, text, text, text, text, text, text, text, boolean, float, float) to authenticated;

-- Supprimer un lieu (admin).
create or replace function public.admin_delete_venue(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from public.venues where id = p_id;
end;
$$;
grant execute on function public.admin_delete_venue(uuid) to authenticated;

-- Dossier complet des lieux (admin) : tous les lieux, y compris masqués/prospects,
-- avec lat/lng et statut de prospection.
create or replace function public.admin_list_venues()
returns table (
  id uuid, name text, type text, city text, address text, description text,
  website text, phone text, photo_url text, featured boolean, status text,
  prospect_status text, contacted_at timestamptz, lng float, lat float
)
language sql security definer set search_path = public as $$
  select v.id, v.name, v.type, v.city, v.address, v.description, v.website, v.phone,
    v.photo_url, v.featured, v.status, v.prospect_status, v.contacted_at,
    st_x(v.location::geometry)::float, st_y(v.location::geometry)::float
  from public.venues v
  where public.is_admin()
  order by
    case v.prospect_status when 'contacte' then 0 when 'a_contacter' then 1 when 'accepte' then 2 else 3 end,
    v.contacted_at desc nulls last, v.created_at desc;
$$;
grant execute on function public.admin_list_venues() to authenticated;

-- Pipeline de prospection : faire évoluer le statut d'un lieu.
--   contacte  → mail envoyé (apparaît dans le dossier, date de contact)
--   accepte   → mis en avant + publié sur le site (featured + status active)
--   refuse    → supprimé
--   a_contacter → réinitialise
create or replace function public.admin_set_venue_prospect(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_status = 'contacte' then
    update public.venues set prospect_status = 'contacte', contacted_at = coalesce(contacted_at, now()) where id = p_id;
  elsif p_status = 'accepte' then
    update public.venues set prospect_status = 'accepte', status = 'active', featured = true where id = p_id;
  elsif p_status = 'refuse' then
    delete from public.venues where id = p_id;   -- refusé = supprimé
  elsif p_status = 'a_contacter' then
    update public.venues set prospect_status = 'a_contacter', contacted_at = null where id = p_id;
  else
    raise exception 'statut inconnu';
  end if;
end;
$$;
grant execute on function public.admin_set_venue_prospect(uuid, text) to authenticated;

-- Basculer la visibilité publique d'un lieu (admin).
create or replace function public.admin_set_venue_visibility(p_id uuid, p_visible boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.venues set status = case when p_visible then 'active' else 'hidden' end where id = p_id;
end;
$$;
grant execute on function public.admin_set_venue_visibility(uuid, boolean) to authenticated;

-- Realtime sur venues (dossier admin mis à jour en direct)
do $$ begin
  alter publication supabase_realtime add table public.venues;
exception when duplicate_object then null; end $$;
