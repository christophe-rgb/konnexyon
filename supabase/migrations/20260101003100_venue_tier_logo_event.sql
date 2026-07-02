-- ============================================================
-- Lieux : formule (tier) → taille de l'épingle · logo · coup de projecteur
-- ============================================================
-- tier: gratuit (standard) | essentiel (agrandi) | premium (2x + médaillon logo)
-- event_until: si dans le futur → "flash" événement sur la carte

alter table public.venues add column if not exists tier text not null default 'gratuit';
alter table public.venues add column if not exists event_until timestamptz;

-- get_venues (recréé avec tier + event_until + tri par formule)
drop function if exists public.get_venues();
create function public.get_venues()
returns table (
  id uuid, name text, type text, city text, address text, description text,
  website text, phone text, photo_url text, featured boolean,
  tier text, event_until timestamptz, lng float, lat float
)
language sql security definer set search_path = public as $$
  select v.id, v.name, v.type, v.city, v.address, v.description, v.website, v.phone, v.photo_url,
    v.featured, v.tier, v.event_until,
    st_x(v.location::geometry)::float, st_y(v.location::geometry)::float
  from public.venues v
  where v.status = 'active'
  order by case v.tier when 'premium' then 0 when 'essentiel' then 1 else 2 end, v.name asc;
$$;
grant execute on function public.get_venues() to anon, authenticated;

-- admin_list_venues (recréé avec tier + event_until)
drop function if exists public.admin_list_venues();
create function public.admin_list_venues()
returns table (
  id uuid, name text, type text, city text, address text, description text,
  website text, phone text, photo_url text, featured boolean, status text,
  prospect_status text, contacted_at timestamptz, tier text, event_until timestamptz,
  lng float, lat float
)
language sql security definer set search_path = public as $$
  select v.id, v.name, v.type, v.city, v.address, v.description, v.website, v.phone, v.photo_url,
    v.featured, v.status, v.prospect_status, v.contacted_at, v.tier, v.event_until,
    st_x(v.location::geometry)::float, st_y(v.location::geometry)::float
  from public.venues v
  where public.is_admin()
  order by
    case v.prospect_status when 'contacte' then 0 when 'a_contacter' then 1 when 'accepte' then 2 else 3 end,
    v.contacted_at desc nulls last, v.created_at desc;
$$;
grant execute on function public.admin_list_venues() to authenticated;

-- Logo (photo) d'un lieu (admin) — comme les photos des bots.
create or replace function public.admin_set_venue_photo(p_id uuid, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.venues set photo_url = p_url where id = p_id;
end;
$$;
grant execute on function public.admin_set_venue_photo(uuid, text) to authenticated;

-- Formule (tier) d'un lieu (admin) → pilote la taille de l'épingle.
create or replace function public.admin_set_venue_tier(p_id uuid, p_tier text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_tier not in ('gratuit','essentiel','premium') then raise exception 'formule inconnue'; end if;
  update public.venues set tier = p_tier, featured = (p_tier = 'premium') where id = p_id;
end;
$$;
grant execute on function public.admin_set_venue_tier(uuid, text) to authenticated;

-- Coup de projecteur "événement" (admin) : p_days jours de flash (0 = arrêter).
create or replace function public.admin_set_venue_event(p_id uuid, p_days int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.venues
     set event_until = case when coalesce(p_days,0) > 0 then now() + (p_days || ' days')::interval else null end
   where id = p_id;
end;
$$;
grant execute on function public.admin_set_venue_event(uuid, int) to authenticated;
