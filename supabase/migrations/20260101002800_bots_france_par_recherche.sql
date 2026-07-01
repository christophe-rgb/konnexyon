-- ============================================================
-- 10 bots couples étalés sur toute la France, un par type de recherche
-- ============================================================
-- Couverture des 4 désirs : Découverte x3, Rencontres occasionnelles x3,
-- Échangisme x2, Expert x2. Sans photo au départ (avatar_url null) → à
-- définir via Admin → Photos des bots. Auto-réponse off : l'admin répond.

-- 1) comptes auth
do $$
declare
  u uuid;
  ids uuid[] := array[
    '22222222-0009-0000-0000-000000000009'::uuid,
    '22222222-0010-0000-0000-000000000010'::uuid,
    '22222222-0011-0000-0000-000000000011'::uuid,
    '22222222-0012-0000-0000-000000000012'::uuid,
    '22222222-0013-0000-0000-000000000013'::uuid,
    '22222222-0014-0000-0000-000000000014'::uuid,
    '22222222-0015-0000-0000-000000000015'::uuid,
    '22222222-0016-0000-0000-000000000016'::uuid,
    '22222222-0017-0000-0000-000000000017'::uuid,
    '22222222-0018-0000-0000-000000000018'::uuid
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

-- 2) profils (lon, lat) — ST_MakePoint(lon, lat)
insert into public.profiles (
  id, couple_name, bio, avatar_url, email_1, orientation,
  seeking, limits, max_distance_km, email_1_confirmed, status, visibility,
  is_bot, hide_location, location, location_updated_at, created_at
) values
-- Paris · Échangisme
('22222222-0009-0000-0000-000000000009','Inès & Rayan',
 'Couple parisien élégant, adeptes des soirées échangistes chics et des clubs select. Raffinement et complicité 🥂',
 null,'ines.rayan@konnexyon.demo','hetero_bi',
 array['echangisme','rencontres_occasionnelles'],array['discretion','preservatif'],0,
 true,'active','public',true,false,
 ST_SetSRID(ST_MakePoint(2.3522,48.8566),4326),now(),now()),
-- Lyon · Découverte
('22222222-0010-0000-0000-000000000010','Marie & Paul',
 'Lyonnais tout juste curieux, on découvre l''univers libertin en douceur. Bienveillance et sourires avant tout ✨',
 null,'marie.paul@konnexyon.demo','hetero_hetero',
 array['decouverte'],array['discretion','preservatif'],0,
 true,'active','public',true,false,
 ST_SetSRID(ST_MakePoint(4.8357,45.7640),4326),now(),now()),
-- Marseille · Rencontres occasionnelles
('22222222-0011-0000-0000-000000000011','Nadia & Sami',
 'Couple marseillais solaire et spontané. On aime les rencontres simples, au soleil, sans prise de tête ☀️',
 null,'nadia.sami@konnexyon.demo','bi_all',
 array['rencontres_occasionnelles','decouverte'],array['preservatif'],0,
 true,'active','public',true,false,
 ST_SetSRID(ST_MakePoint(5.3698,43.2965),4326),now(),now()),
-- Toulouse · Expert
('22222222-0012-0000-0000-000000000012','Clara & Hugo',
 'Couple toulousain expérimenté et exigeant. On cherche des complices à la hauteur, dans le respect et le plaisir 🔥',
 null,'clara.hugo@konnexyon.demo','hetero_bi',
 array['expert','echangisme'],array['discretion','preservatif'],0,
 true,'active','public',true,false,
 ST_SetSRID(ST_MakePoint(1.4442,43.6047),4326),now(),now()),
-- Bordeaux · Découverte
('22222222-0013-0000-0000-000000000013','Sophie & Antoine',
 'Bordelais amateurs de bons vins et de nouvelles expériences. On débute, curieux et attentionnés 🍷',
 null,'sophie.antoine@konnexyon.demo','hetero_hetero',
 array['decouverte'],array['discretion','preservatif'],0,
 true,'active','public',true,false,
 ST_SetSRID(ST_MakePoint(-0.5792,44.8378),4326),now(),now()),
-- Nantes · Rencontres occasionnelles
('22222222-0014-0000-0000-000000000014','Laura & Kevin',
 'Couple nantais complice, ouverts aux belles rencontres occasionnelles. Discrets et chaleureux 🌿',
 null,'laura.kevin@konnexyon.demo','hetero_bi',
 array['rencontres_occasionnelles','decouverte'],array['preservatif'],0,
 true,'active','public',true,false,
 ST_SetSRID(ST_MakePoint(-1.5536,47.2184),4326),now(),now()),
-- Lille · Échangisme
('22222222-0015-0000-0000-000000000015','Emma & Lucas',
 'Ch''ti couple joueur, fans de soirées échangistes conviviales. Ambiance détendue et bienveillante 🍻',
 null,'emma.lucas.lille@konnexyon.demo','bi_all',
 array['echangisme','rencontres_occasionnelles'],array['discretion','preservatif'],0,
 true,'active','public',true,false,
 ST_SetSRID(ST_MakePoint(3.0573,50.6292),4326),now(),now()),
-- Nice · Expert
('22222222-0016-0000-0000-000000000016','Julia & Marco',
 'Couple niçois raffiné et expérimenté. On aime la Côte d''Azur, les rencontres choisies et le plaisir partagé 🌊',
 null,'julia.marco@konnexyon.demo','hetero_bi',
 array['expert','echangisme'],array['discretion','preservatif'],0,
 true,'active','public',true,false,
 ST_SetSRID(ST_MakePoint(7.2620,43.7102),4326),now(),now()),
-- Strasbourg · Découverte
('22222222-0017-0000-0000-000000000017','Chloé & Théo',
 'Couple strasbourgeois curieux, on explore le libertinage pas à pas. Douceur, respect et complicité 🌸',
 null,'chloe.theo@konnexyon.demo','hetero_hetero',
 array['decouverte'],array['discretion','preservatif'],0,
 true,'active','public',true,false,
 ST_SetSRID(ST_MakePoint(7.7521,48.5734),4326),now(),now()),
-- Rennes · Rencontres occasionnelles
('22222222-0018-0000-0000-000000000018','Manon & Gaël',
 'Couple breton authentique, partants pour des rencontres occasionnelles sincères. Simples et souriants 🌦️',
 null,'manon.gael@konnexyon.demo','hetero_bi',
 array['rencontres_occasionnelles','decouverte'],array['preservatif'],0,
 true,'active','public',true,false,
 ST_SetSRID(ST_MakePoint(-1.6778,48.1173),4326),now(),now())
on conflict (id) do nothing;
