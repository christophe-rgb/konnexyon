-- 30 faux profils pour Konnexyon
-- Colonnes correctes : orientation (enum), location (PostGIS), sans plan ni orientation_lui/elle
-- A executer dans Supabase SQL Editor (service role requis pour auth.users)

DO $$
DECLARE
  u UUID;
  ids UUID[] := ARRAY[
    '11111111-0001-0000-0000-000000000001'::UUID,
    '11111111-0002-0000-0000-000000000002'::UUID,
    '11111111-0003-0000-0000-000000000003'::UUID,
    '11111111-0004-0000-0000-000000000004'::UUID,
    '11111111-0005-0000-0000-000000000005'::UUID,
    '11111111-0006-0000-0000-000000000006'::UUID,
    '11111111-0007-0000-0000-000000000007'::UUID,
    '11111111-0008-0000-0000-000000000008'::UUID,
    '11111111-0009-0000-0000-000000000009'::UUID,
    '11111111-0010-0000-0000-000000000010'::UUID,
    '11111111-0011-0000-0000-000000000011'::UUID,
    '11111111-0012-0000-0000-000000000012'::UUID,
    '11111111-0013-0000-0000-000000000013'::UUID,
    '11111111-0014-0000-0000-000000000014'::UUID,
    '11111111-0015-0000-0000-000000000015'::UUID,
    '11111111-0016-0000-0000-000000000016'::UUID,
    '11111111-0017-0000-0000-000000000017'::UUID,
    '11111111-0018-0000-0000-000000000018'::UUID,
    '11111111-0019-0000-0000-000000000019'::UUID,
    '11111111-0020-0000-0000-000000000020'::UUID,
    '11111111-0021-0000-0000-000000000021'::UUID,
    '11111111-0022-0000-0000-000000000022'::UUID,
    '11111111-0023-0000-0000-000000000023'::UUID,
    '11111111-0024-0000-0000-000000000024'::UUID,
    '11111111-0025-0000-0000-000000000025'::UUID,
    '11111111-0026-0000-0000-000000000026'::UUID,
    '11111111-0027-0000-0000-000000000027'::UUID,
    '11111111-0028-0000-0000-000000000028'::UUID,
    '11111111-0029-0000-0000-000000000029'::UUID,
    '11111111-0030-0000-0000-000000000030'::UUID
  ];
BEGIN
  FOREACH u IN ARRAY ids LOOP
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
    )
    VALUES (
      u,
      'fake_' || u || '@konnexyon.demo',
      crypt('demo1234', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}', '{}',
      'authenticated', 'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

INSERT INTO profiles (
  id, couple_name, bio, avatar_url, email_1, orientation,
  seeking, limits, max_distance_km,
  email_1_confirmed, status, visibility,
  location, location_updated_at, created_at
)
VALUES
('11111111-0001-0000-0000-000000000001','Alex & Camille','Couple parisien, ouverts et discrets. On aime les soirees conviviales et les rencontres authentiques.','https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&q=80','alex.camille@konnexyon.demo','hetero_bi',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['discretion','preservatif'],50,true,'active','public',ST_SetSRID(ST_MakePoint(2.3522,48.8566),4326),NOW(),NOW()),
('11111111-0002-0000-0000-000000000002','Theo & Ines','Nous explorons depuis 6 mois. Curieux et bienveillants, on cherche des couples sympas sur Paris.','https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&q=80','theo.ines@konnexyon.demo','hetero_hetero',ARRAY['decouverte','rencontres_occasionnelles'],ARRAY['preservatif','pas_photo'],40,true,'active','public',ST_SetSRID(ST_MakePoint(2.3600,48.8700),4326),NOW(),NOW()),
('11111111-0003-0000-0000-000000000003','Julien & Sofia','Couple libre depuis 3 ans. On apprecie les echanges intellectuels autant que physiques. Banlieue ouest.','https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=600&q=80','julien.sofia@konnexyon.demo','bi_all',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['discretion','pas_contact_hors_site'],80,true,'active','public',ST_SetSRID(ST_MakePoint(2.2900,48.8400),4326),NOW(),NOW()),
('11111111-0004-0000-0000-000000000004','Marc & Elodie','Lyonnais de coeur, libertins de conviction. Soirees, restaurants, rencontres. Lifestyle depuis 5 ans.','https://images.unsplash.com/photo-1521305916504-4a1121188589?w=600&q=80','marc.elodie@konnexyon.demo','hetero_hetero',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['preservatif','discretion'],100,true,'active','public',ST_SetSRID(ST_MakePoint(4.8357,45.7640),4326),NOW(),NOW()),
('11111111-0005-0000-0000-000000000005','Romain & Lucie','Couple de 30 ans, Lyon 6eme. Decouverte en douceur, on prend notre temps. Bienveillance avant tout.','https://images.unsplash.com/photo-1464692805480-a69dfaafdb0d?w=600&q=80','romain.lucie@konnexyon.demo','hetero_bi',ARRAY['decouverte'],ARRAY['preservatif','pas_penetration'],60,true,'active','public',ST_SetSRID(ST_MakePoint(4.8420,45.7720),4326),NOW(),NOW()),
('11111111-0006-0000-0000-000000000006','Nico & Ambre','Marseillais passionnes. On aime la mer, le soleil et les rencontres sans prise de tete.','https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&q=80','nico.ambre@konnexyon.demo','hetero_hetero',ARRAY['rencontres_occasionnelles','echangisme'],ARRAY['discretion','preservatif'],80,true,'active','public',ST_SetSRID(ST_MakePoint(5.3698,43.2965),4326),NOW(),NOW()),
('11111111-0007-0000-0000-000000000007','Luca & Mathilde','Entre vignes et liberte. Couple bordelais discret, on privilege la qualite sur la quantite.','https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=600&q=80','luca.mathilde@konnexyon.demo','hetero_bi',ARRAY['rencontres_occasionnelles','decouverte'],ARRAY['pas_photo','discretion'],70,true,'active','public',ST_SetSRID(ST_MakePoint(-0.5792,44.8378),4326),NOW(),NOW()),
('11111111-0008-0000-0000-000000000008','Antoine & Lea','La Cote d Azur comme terrain de jeu. Couple solaire, ouvert, et vraiment discret.','https://images.unsplash.com/photo-1541823709867-1b206113eafd?w=600&q=80','antoine.lea@konnexyon.demo','hetero_bi',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['preservatif','pas_contact_hors_site'],60,true,'active','public',ST_SetSRID(ST_MakePoint(7.2620,43.7102),4326),NOW(),NOW()),
('11111111-0009-0000-0000-000000000009','Pierre & Noemie','Toulousains, couple ouvert depuis 2 ans. On cherche des echanges sinceres et des rencontres memorables.','https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80','pierre.noemie@konnexyon.demo','hetero_hetero',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['discretion','preservatif'],80,true,'active','public',ST_SetSRID(ST_MakePoint(1.4442,43.6047),4326),NOW(),NOW()),
('11111111-0010-0000-0000-000000000010','Hugo & Clara','Alsaciens aux frontieres de l Europe et de la liberte. Couple curieux et attentionne.','https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&q=80','hugo.clara@konnexyon.demo','hetero_bi',ARRAY['decouverte','rencontres_occasionnelles'],ARRAY['preservatif','discretion'],60,true,'active','public',ST_SetSRID(ST_MakePoint(7.7521,48.5734),4326),NOW(),NOW()),
('11111111-0011-0000-0000-000000000011','Ethan & Zoe','Nantais cool et nature. On cherche des couples sympas pour partager sans se prendre la tete.','https://images.unsplash.com/photo-1552058544-f2b08422138a?w=600&q=80','ethan.zoe@konnexyon.demo','hetero_hetero',ARRAY['rencontres_occasionnelles','decouverte'],ARRAY['preservatif'],70,true,'active','public',ST_SetSRID(ST_MakePoint(-1.5536,47.2184),4326),NOW(),NOW()),
('11111111-0012-0000-0000-000000000012','Sam & Chloe','Soleil et liberte a Montpellier. Couple ouvert depuis 1 an, on apprend encore et c est beau.','https://images.unsplash.com/photo-1536766820879-059fec98ec0a?w=600&q=80','sam.chloe@konnexyon.demo','bi_all',ARRAY['decouverte','rencontres_ocasionnelles'],ARRAY['pas_photo','preservatif'],60,true,'active','public',ST_SetSRID(ST_MakePoint(3.8767,43.6108),4326),NOW(),NOW()),
('11111111-0013-0000-0000-000000000013','Tom & Jade','Chtis et fiers. Couple nord/belge de frontiere, tres ouvert, tres discret. Bienveillants toujours.','https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80','tom.jade@konnexyon.demo','hetero_hetero',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['discretion','preservatif'],80,true,'active','public',ST_SetSRID(ST_MakePoint(3.0573,50.6292),4326),NOW(),NOW()),
('11111111-0014-0000-0000-000000000014','Max & Tina','Montagnards libertins entre deux randos. Grenoblois nature et sensuels.','https://images.unsplash.com/photo-1604004555489-723a93d6ce74?w=600&q=80','max.tina@konnexyon.demo','hetero_bi',ARRAY['rencontres_occasionnelles','echangisme'],ARRAY['preservatif','pas_contact_hors_site'],80,true,'active','public',ST_SetSRID(ST_MakePoint(5.7245,45.1885),4326),NOW(),NOW()),
('11111111-0015-0000-0000-000000000015','Yann & Celia','Bretons libres comme ocean. Couple aventurier qui aime les rencontres humaines et chaleureuses.','https://images.unsplash.com/photo-1470116945706-e6bf5d5a53ca?w=600&q=80','yann.celia@konnexyon.demo','hetero_hetero',ARRAY['decouverte','rencontres_occasionnelles'],ARRAY['discretion'],60,true,'active','public',ST_SetSRID(ST_MakePoint(-1.6778,48.1173),4326),NOW(),NOW()),
('11111111-0016-0000-0000-000000000016','Adrien & Manon','Bruxellois cosmopolites. On parle francais, on pense librement. Couple discret et cultive.','https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80','adrien.manon@konnexyon.demo','hetero_bi',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['discretion','preservatif'],80,true,'active','public',ST_SetSRID(ST_MakePoint(4.3517,50.8503),4326),NOW(),NOW()),
('11111111-0017-0000-0000-000000000017','Kevin & Sarah','Couple bruxellois jeune. Lifestyle depuis 8 mois. On decouvre avec plaisir et sans stress.','https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80','kevin.sarah@konnexyon.demo','hetero_hetero',ARRAY['decouverte'],ARRAY['preservatif','pas_penetration'],50,true,'active','public',ST_SetSRID(ST_MakePoint(4.3700,50.8600),4326),NOW(),NOW()),
('11111111-0018-0000-0000-000000000018','Ben & Axelle','Liegeois bon vivants. Lifestyle, soirees, rencontres en bonne intelligence. Couple solide de 7 ans.','https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80','ben.axelle@konnexyon.demo','hetero_bi',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['discretion','preservatif'],80,true,'active','public',ST_SetSRID(ST_MakePoint(5.5797,50.6326),4326),NOW(),NOW()),
('11111111-0019-0000-0000-000000000019','Florian & Amelie','Anversois franco-flamands. Culture du respect et de la discretion. On cherche des couples de qualite.','https://images.unsplash.com/photo-1523419409543-a5e549c1faa8?w=600&q=80','florian.amelie@konnexyon.demo','hetero_bi',ARRAY['rencontres_occasionnelles','echangisme'],ARRAY['pas_photo','discretion'],70,true,'active','public',ST_SetSRID(ST_MakePoint(4.4025,51.2194),4326),NOW(),NOW()),
('11111111-0020-0000-0000-000000000020','Olivier & Nathalie','Couple genevois, professions liberales. Lifestyle depuis 4 ans. Discretion totale, qualite recherchee.','https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80','olivier.nathalie@konnexyon.demo','hetero_hetero',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['discretion','pas_photo','preservatif'],80,true,'active','public',ST_SetSRID(ST_MakePoint(6.1432,46.2044),4326),NOW(),NOW()),
('11111111-0021-0000-0000-000000000021','David & Claire','Expats genevois. Ouverture d esprit garantie. On cherche des echanges humains vrais.','https://images.unsplash.com/photo-1484399172022-72a90b12e3c1?w=600&q=80','david.claire@konnexyon.demo','bi_all',ARRAY['rencontres_occasionnelles','decouverte'],ARRAY['discretion','preservatif'],100,true,'active','public',ST_SetSRID(ST_MakePoint(6.1500,46.2100),4326),NOW(),NOW()),
('11111111-0022-0000-0000-000000000022','Raphael & Julie','Lausannois, milieu universitaire. Couple de 32 ans, curieux et bienveillants. Premiere aventure lifestyle.','https://images.unsplash.com/photo-1545912452-8aea7e25a3d3?w=600&q=80','raphael.julie@konnexyon.demo','hetero_bi',ARRAY['decouverte'],ARRAY['preservatif','pas_photo'],60,true,'active','public',ST_SetSRID(ST_MakePoint(6.6323,46.5197),4326),NOW(),NOW()),
('11111111-0023-0000-0000-000000000023','Stefan & Amelie','Fribourgeois bilingues, ouverts et cultives. Lifestyle selectif depuis 2 ans.','https://images.unsplash.com/photo-1537392051-03e4c6a17d8a?w=600&q=80','stefan.amelie@konnexyon.demo','hetero_hetero',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['discretion','preservatif'],80,true,'active','public',ST_SetSRID(ST_MakePoint(7.1619,46.8065),4326),NOW(),NOW()),
('11111111-0024-0000-0000-000000000024','Guillaume & Emilie','Montrealais, Plateau-Mont-Royal. Lifestyle depuis 3 ans, tres ouverts, vraiment bienveillants.','https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80','guillaume.emilie@konnexyon.demo','hetero_bi',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['preservatif','discretion'],80,true,'active','public',ST_SetSRID(ST_MakePoint(-73.5673,45.5017),4326),NOW(),NOW()),
('11111111-0025-0000-0000-000000000025','Antoine & Marie-Pier','Rosemont, Montreal. Couple libre depuis 1 an. Debutants enthousiastes qui prennent leur temps.','https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=600&q=80','antoine.mariepier@konnexyon.demo','hetero_hetero',ARRAY['decouverte','rencontres_occasionnelles'],ARRAY['preservatif'],60,true,'active','public',ST_SetSRID(ST_MakePoint(-73.5800,45.5200),4326),NOW(),NOW()),
('11111111-0026-0000-0000-000000000026','Xavier & Isabelle','Laval/Montreal. Lifestyle 5+ ans. On aime les soirees entre couples cool et la bonne humeur.','https://images.unsplash.com/photo-1529360829904-80c13a267038?w=600&q=80','xavier.isabelle@konnexyon.demo','bi_all',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['discretion','preservatif','pas_contact_hors_site'],80,true,'active','public',ST_SetSRID(ST_MakePoint(-73.7500,45.6000),4326),NOW(),NOW()),
('11111111-0027-0000-0000-000000000027','Francois & Anne','Vieux-Quebec, couple de 40 ans. Lifestyle discret depuis 6 ans. Qualite, respect, bonne humeur.','https://images.unsplash.com/photo-1518577915332-c2a19f149a75?w=600&q=80','francois.anne@konnexyon.demo','hetero_hetero',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['discretion','preservatif'],100,true,'active','public',ST_SetSRID(ST_MakePoint(-71.2080,46.8139),4326),NOW(),NOW()),
('11111111-0028-0000-0000-000000000028','Damien & Laura','Val de Loire, douceur de vivre et libertinage tranquille. Couple de 35 ans, stable et ouvert.','https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=600&q=80','damien.laura@konnexyon.demo','hetero_bi',ARRAY['rencontres_occasionnelles','decouverte'],ARRAY['preservatif','discretion'],80,true,'active','public',ST_SetSRID(ST_MakePoint(0.6848,47.3941),4326),NOW(),NOW()),
('11111111-0029-0000-0000-000000000029','Alexis & Pauline','Mosellans a la croisee des cultures. Couple curieux, discret, et sincerement bienveillant.','https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80','alexis.pauline@konnexyon.demo','hetero_hetero',ARRAY['decouverte','rencontres_occasionnelles'],ARRAY['discretion','preservatif'],60,true,'active','public',ST_SetSRID(ST_MakePoint(6.1757,49.1193),4326),NOW(),NOW()),
('11111111-0030-0000-0000-000000000030','Victor & Emma','Bourguignons epicuriens. Entre pinot noir et liberte, on cherche des couples qui aiment la vie vraiment.','https://images.unsplash.com/photo-1496440737103-cd596325d314?w=600&q=80','victor.emma@konnexyon.demo','hetero_bi',ARRAY['echangisme','rencontres_occasionnelles'],ARRAY['preservatif','pas_photo'],80,true,'active','public',ST_SetSRID(ST_MakePoint(5.0415,47.3220),4326),NOW(),NOW())

ON CONFLICT (id) DO NOTHING;
