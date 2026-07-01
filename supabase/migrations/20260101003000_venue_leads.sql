-- ============================================================
-- Réponses des lieux (mini étude de marché / formulaire partenaire public)
-- ============================================================
-- Un lieu répond directement depuis /partenaire → sa réponse arrive tout de
-- suite dans le dossier admin (Realtime).

create table if not exists public.venue_leads (
  id           uuid primary key default gen_random_uuid(),
  venue_name   text not null,
  city         text,
  type         text,
  contact_name text,
  email        text,
  phone        text,
  formule      text,   -- gratuit | essentiel | premium | infos
  message      text,
  handled      boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.venue_leads enable row level security;

-- Lecture réservée à l'admin (les réponses ne sont jamais publiques).
drop policy if exists leads_admin_select on public.venue_leads;
create policy leads_admin_select on public.venue_leads for select using (public.is_admin());
grant select on public.venue_leads to authenticated;

-- Soumission publique (même non connecté) via RPC sécurisée.
create or replace function public.submit_venue_lead(
  p_venue_name text, p_city text, p_type text, p_contact_name text,
  p_email text, p_phone text, p_formule text, p_message text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(btrim(p_venue_name), '') = '' then raise exception 'nom requis'; end if;
  insert into public.venue_leads (venue_name, city, type, contact_name, email, phone, formule, message)
  values (btrim(p_venue_name), p_city, p_type, p_contact_name, p_email, p_phone, p_formule, left(coalesce(p_message,''), 2000));
end;
$$;
grant execute on function public.submit_venue_lead(text,text,text,text,text,text,text,text) to anon, authenticated;

-- Dossier des réponses (admin).
create or replace function public.admin_list_leads()
returns setof public.venue_leads language sql security definer set search_path = public as $$
  select * from public.venue_leads where public.is_admin() order by handled asc, created_at desc;
$$;
grant execute on function public.admin_list_leads() to authenticated;

-- Marquer une réponse comme traitée / non traitée (admin).
create or replace function public.admin_mark_lead(p_id uuid, p_handled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.venue_leads set handled = coalesce(p_handled, true) where id = p_id;
end;
$$;
grant execute on function public.admin_mark_lead(uuid, boolean) to authenticated;

-- Realtime (le dossier admin s'actualise dès qu'un lieu répond).
do $$ begin
  alter publication supabase_realtime add table public.venue_leads;
exception when duplicate_object then null; end $$;
