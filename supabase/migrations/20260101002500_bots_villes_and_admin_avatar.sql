-- ============================================================
-- 5 bots "couples" (Lyon x2, Paris x2, Montpellier x1)
-- + fonction admin pour définir la photo d'un bot
-- ============================================================
-- Ces bots apparaissent en découverte et peuvent recevoir des messages.
-- L'auto-réponse est désactivée (migration 20260101002400) : c'est l'admin
-- qui répond à leur place via la "Boîte des bots".

-- 1) Comptes auth des bots (service_role requis — SQL editor OK)
do $$
declare
  u uuid;
  ids uuid[] := array[
    '22222222-0004-0000-0000-000000000004'::uuid,
    '22222222-0005-0000-0000-000000000005'::uuid,
    '22222222-0006-0000-0000-000000000006'::uuid,
    '22222222-0007-0000-0000-000000000007'::uuid,
    '22222222-0008-0000-0000-000000000008'::uuid
  ];
begin
  foreach u in array ids loop
    insert into auth.users (
      id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
    ) values (
      u, 'bot_' || u || '@konnexyon.demo', crypt('demo1234', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'
    ) on conflict (id) do nothing;
  end loop;
end $$;

-- 2) Profils bots. avatar_url = null au départ : tu mets TES photos ensuite
--    depuis l'admin → onglet "Photos des bots" (upload en un clic).
--    Lyon ~ 45.7640 N, 4.8357 E · Paris ~ 48.8566 N, 2.3522 E · Montpellier ~ 43.6108 N, 3.8767 E
insert into public.profiles (
  id, couple_name, bio, avatar_url, email_1, orientation,
  seeking, limits, max_distance_km, email_1_confirmed, status, visibility,
  is_bot, location, location_updated_at, created_at
) values
-- ── Lyon ──
('22222222-0004-0000-0000-000000000004','Emma & Thomas',
 'Lyonnais discrets et complices. On aime les belles rencontres autour d''un verre en presqu''île 🍷',
 null,'emma.thomas@konnexyon.demo','hetero_bi',
 array['echangisme','rencontres_occasionnelles'],array['discretion','preservatif'],80,
 true,'active','public',true,
 ST_SetSRID(ST_MakePoint(4.8357,45.7640),4326),now(),now()),
('22222222-0005-0000-0000-000000000005','Léa & Nicolas',
 'Couple curieux de Lyon, ouverts et bienveillants. On avance en douceur, dans le respect 🌙',
 null,'lea.nicolas@konnexyon.demo','bi_all',
 array['rencontres_occasionnelles','decouverte'],array['preservatif'],90,
 true,'active','public',true,
 ST_SetSRID(ST_MakePoint(4.8500,45.7500),4326),now(),now()),
-- ── Paris ──
('22222222-0006-0000-0000-000000000006','Chloé & Alexandre',
 'Parisiens libertins, amateurs de soirées élégantes et de complicité. Toujours partants pour découvrir ✨',
 null,'chloe.alexandre@konnexyon.demo','hetero_bi',
 array['echangisme','rencontres_occasionnelles','decouverte'],array['discretion','preservatif'],80,
 true,'active','public',true,
 ST_SetSRID(ST_MakePoint(2.3522,48.8566),4326),now(),now()),
('22222222-0007-0000-0000-000000000007','Manon & Julien',
 'On vit à Paris, on aime sortir, rire et rencontrer d''autres couples sur la même longueur d''onde 🔥',
 null,'manon.julien@konnexyon.demo','bi_all',
 array['rencontres_occasionnelles','decouverte'],array['preservatif'],100,
 true,'active','public',true,
 ST_SetSRID(ST_MakePoint(2.3400,48.8700),4326),now(),now()),
-- ── Montpellier ──
('22222222-0008-0000-0000-000000000008','Sarah & Kevin',
 'Couple du sud à Montpellier, solaires et décomplexés. On adore les rencontres simples et sincères ☀️',
 null,'sarah.kevin@konnexyon.demo','hetero_bi',
 array['echangisme','rencontres_occasionnelles'],array['discretion','preservatif'],90,
 true,'active','public',true,
 ST_SetSRID(ST_MakePoint(3.8767,43.6108),4326),now(),now())
on conflict (id) do nothing;

-- 3) Fonction admin : définir la photo d'un bot (modifier un profil qui n'est
--    pas le sien est bloqué par la RLS → on passe par une RPC security definer
--    qui vérifie le rôle admin).
create or replace function public.admin_set_bot_avatar(p_bot_id uuid, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.profiles
     set avatar_url = p_url
   where id = p_bot_id and is_bot;
  if not found then raise exception 'bot introuvable'; end if;
end;
$$;
grant execute on function public.admin_set_bot_avatar(uuid, text) to authenticated;
