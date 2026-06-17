-- 30 faux profils européens pour Konnexyon
-- Insère d'abord dans auth.users puis dans profiles

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
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (u, 'fake_' || u || '@konnexyon.demo', crypt('demo1234', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

INSERT INTO profiles (id, couple_name, bio, avatar_url, email_1, orientation_lui, orientation_elle, seeking, limits, max_distance_km, email_1_confirmed, status, plan, created_at)
VALUES
-- France — Paris & région
('11111111-0001-0000-0000-000000000001', 'Alex & Camille', 'Couple parisien, ouverts et discrets. On aime les soirées conviviales et les rencontres authentiques.', 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&q=80', 'alex.camille@konnexyon.demo', 'hetero', 'bi', ARRAY['echangisme','rencontres_occasionnelles'], ARRAY['discretion','preservatif'], 8, true, 'active', 'free', NOW()),

('11111111-0002-0000-0000-000000000002', 'Théo & Inès', 'Nous explorons depuis 6 mois. Curieux et bienveillants, on cherche des couples sympas sur Paris.', 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&q=80', 'theo.ines@konnexyon.demo', 'hetero', 'hetero', ARRAY['decouverte','rencontres_occasionnelles'], ARRAY['preservatif','pas_photo'], 14, true, 'active', 'premium', NOW()),

('11111111-0003-0000-0000-000000000003', 'Julien & Sofia', 'Couple libre depuis 3 ans. On apprécie les échanges intellectuels autant que physiques. Banlieue ouest.', 'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=600&q=80', 'julien.sofia@konnexyon.demo', 'bi', 'bi', ARRAY['echangisme','expert'], ARRAY['discretion','pas_contact_hors_site'], 19, true, 'active', 'free', NOW()),

-- France — Lyon
('11111111-0004-0000-0000-000000000004', 'Marc & Élodie', 'Lyonnais de cœur, libertins de conviction. Soirées, restaurants, rencontres. Lifestyle depuis 5 ans.', 'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=600&q=80', 'marc.elodie@konnexyon.demo', 'hetero', 'hetero', ARRAY['echangisme','rencontres_occasionnelles'], ARRAY['preservatif','discretion'], 245, true, 'active', 'premium', NOW()),

('11111111-0005-0000-0000-000000000005', 'Romain & Lucie', 'Couple de 30 ans, Lyon 6ème. Découverte en douceur, on prend notre temps. Bienveillance avant tout.', 'https://images.unsplash.com/photo-1464692805480-a69dfaafdb0d?w=600&q=80', 'romain.lucie@konnexyon.demo', 'hetero', 'bi', ARRAY['decouverte'], ARRAY['preservatif','pas_penetration'], 248, true, 'active', 'free', NOW()),

-- France — Marseille
('11111111-0006-0000-0000-000000000006', 'Nico & Ambre', 'Marseillais passionnés. On aime la mer, le soleil et les rencontres sans prise de tête.', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&q=80', 'nico.ambre@konnexyon.demo', 'hetero', 'hetero', ARRAY['rencontres_occasionnelles','echangisme'], ARRAY['discretion','preservatif'], 775, true, 'active', 'free', NOW()),

-- France — Bordeaux
('11111111-0007-0000-0000-000000000007', 'Luca & Mathilde', 'Entre vignes et liberté. Couple bordelais discret, on privilégie la qualité sur la quantité.', 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=600&q=80', 'luca.mathilde@konnexyon.demo', 'bi', 'hetero', ARRAY['rencontres_occasionnelles','decouverte'], ARRAY['pas_photo','discretion'], 592, true, 'active', 'premium', NOW()),

-- France — Nice
('11111111-0008-0000-0000-000000000008', 'Antoine & Léa', 'La Côte d''Azur comme terrain de jeu. Couple solaire, ouvert, et vraiment discret.', 'https://images.unsplash.com/photo-1541823709867-1b206113eafd?w=600&q=80', 'antoine.lea@konnexyon.demo', 'hetero', 'bi', ARRAY['echangisme','rencontres_occasionnelles'], ARRAY['preservatif','pas_contact_hors_site'], 933, true, 'active', 'free', NOW()),

-- France — Toulouse
('11111111-0009-0000-0000-000000000009', 'Pierre & Noémie', 'Toulousains, couple ouvert depuis 2 ans. On cherche des échanges sincères et des rencontres mémorables.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80', 'pierre.noemie@konnexyon.demo', 'hetero', 'hetero', ARRAY['echangisme','expert'], ARRAY['discretion','preservatif'], 679, true, 'active', 'free', NOW()),

-- France — Strasbourg
('11111111-0010-0000-0000-000000000010', 'Hugo & Clara', 'Alsaciens aux frontières de l''Europe et de la liberté. Couple curieux et attentionné.', 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&q=80', 'hugo.clara@konnexyon.demo', 'hetero', 'bi', ARRAY['decouverte','rencontres_occasionnelles'], ARRAY['preservatif','discretion'], 490, true, 'active', 'premium', NOW()),

-- France — Nantes
('11111111-0011-0000-0000-000000000011', 'Ethan & Zoé', 'Nantais cool et nature. On cherche des couples sympas pour partager sans se prendre la tête.', 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=600&q=80', 'ethan.zoe@konnexyon.demo', 'hetero', 'hetero', ARRAY['rencontres_occasionnelles','decouverte'], ARRAY['preservatif'], 385, true, 'active', 'free', NOW()),

-- France — Montpellier
('11111111-0012-0000-0000-000000000012', 'Sam & Chloé', 'Soleil et liberté à Montpellier. Couple ouvert depuis 1 an, on apprend encore et c''est beau.', 'https://images.unsplash.com/photo-1536766820879-059fec98ec0a?w=600&q=80', 'sam.chloe@konnexyon.demo', 'bi', 'bi', ARRAY['decouverte','rencontres_occasionnelles'], ARRAY['pas_photo','preservatif'], 743, true, 'active', 'free', NOW()),

-- France — Lille
('11111111-0013-0000-0000-000000000013', 'Tom & Jade', 'Ch''tis et fiers. Couple nord/belge de frontière, très ouvert, très discret. Bienveillants toujours.', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', 'tom.jade@konnexyon.demo', 'hetero', 'hetero', ARRAY['echangisme','rencontres_occasionnelles'], ARRAY['discretion','preservatif'], 222, true, 'active', 'premium', NOW()),

-- France — Grenoble
('11111111-0014-0000-0000-000000000014', 'Max & Tina', 'Montagnards libertins entre deux randos. Grenoblois nature et sensuels.', 'https://images.unsplash.com/photo-1604004555489-723a93d6ce74?w=600&q=80', 'max.tina@konnexyon.demo', 'hetero', 'bi', ARRAY['rencontres_occasionnelles','echangisme'], ARRAY['preservatif','pas_contact_hors_site'], 566, true, 'active', 'free', NOW()),

-- France — Rennes
('11111111-0015-0000-0000-000000000015', 'Yann & Célia', 'Bretons libres comme l''océan. Couple aventurier qui aime les rencontres humaines et chaleureuses.', 'https://images.unsplash.com/photo-1470116945706-e6bf5d5a53ca?w=600&q=80', 'yann.celia@konnexyon.demo', 'hetero', 'hetero', ARRAY['decouverte','rencontres_occasionnelles'], ARRAY['discretion'], 351, true, 'active', 'free', NOW()),

-- Belgique — Bruxelles
('11111111-0016-0000-0000-000000000016', 'Adrien & Manon', 'Bruxellois cosmopolites. On parle français, on pense librement. Couple discret et cultivé.', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80', 'adrien.manon@konnexyon.demo', 'hetero', 'bi', ARRAY['echangisme','rencontres_occasionnelles'], ARRAY['discretion','preservatif'], 283, true, 'active', 'premium', NOW()),

('11111111-0017-0000-0000-000000000017', 'Kevin & Sarah', 'Couple bruxellois jeune (28/26 ans). Lifestyle depuis 8 mois. On découvre avec plaisir et sans stress.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80', 'kevin.sarah@konnexyon.demo', 'hetero', 'hetero', ARRAY['decouverte'], ARRAY['preservatif','pas_penetration'], 280, true, 'active', 'free', NOW()),

-- Belgique — Liège
('11111111-0018-0000-0000-000000000018', 'Ben & Axelle', 'Liégeois bon vivants. Lifestyle, soirées, rencontres en bonne intelligence. Couple solide de 7 ans.', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80', 'ben.axelle@konnexyon.demo', 'bi', 'hetero', ARRAY['echangisme','expert'], ARRAY['discretion','preservatif'], 341, true, 'active', 'free', NOW()),

-- Belgique — Anvers
('11111111-0019-0000-0000-000000000019', 'Florian & Amélie', 'Anversois franco-flamands. Culture du respect et de la discrétion. On cherche des couples de qualité.', 'https://images.unsplash.com/photo-1523419409543-a5e549c1faa8?w=600&q=80', 'florian.amelie@konnexyon.demo', 'hetero', 'bi', ARRAY['rencontres_occasionnelles','echangisme'], ARRAY['pas_photo','discretion'], 318, true, 'active', 'premium', NOW()),

-- Suisse — Genève
('11111111-0020-0000-0000-000000000020', 'Olivier & Nathalie', 'Couple genevois, professions libérales. Lifestyle depuis 4 ans. Discrétion totale, qualité recherchée.', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80', 'olivier.nathalie@konnexyon.demo', 'hetero', 'hetero', ARRAY['echangisme','rencontres_occasionnelles'], ARRAY['discretion','pas_photo','preservatif'], 511, true, 'active', 'premium', NOW()),

('11111111-0021-0000-0000-000000000021', 'David & Claire', 'Expats genevois (institutions internationales). Ouverture d''esprit garantie. On cherche des échanges humains vrais.', 'https://images.unsplash.com/photo-1484399172022-72a90b12e3c1?w=600&q=80', 'david.claire@konnexyon.demo', 'bi', 'bi', ARRAY['rencontres_occasionnelles','decouverte'], ARRAY['discretion','preservatif'], 514, true, 'active', 'free', NOW()),

-- Suisse — Lausanne
('11111111-0022-0000-0000-000000000022', 'Raphaël & Julie', 'Lausannois, milieu universitaire. Couple de 32 ans, curieux et bienveillants. Première aventure lifestyle.', 'https://images.unsplash.com/photo-1545912452-8aea7e25a3d3?w=600&q=80', 'raphael.julie@konnexyon.demo', 'hetero', 'bi', ARRAY['decouverte'], ARRAY['preservatif','pas_photo'], 557, true, 'active', 'free', NOW()),

-- Suisse — Fribourg
('11111111-0023-0000-0000-000000000023', 'Stefan & Amélie', 'Fribourgeois bilingues, ouverts et cultivés. Lifestyle sélectif depuis 2 ans. On privilégie la connexion humaine.', 'https://images.unsplash.com/photo-1537392051-03e4c6a17d8a?w=600&q=80', 'stefan.amelie@konnexyon.demo', 'hetero', 'hetero', ARRAY['echangisme','rencontres_occasionnelles'], ARRAY['discretion','preservatif'], 534, true, 'active', 'premium', NOW()),

-- Québec — Montréal
('11111111-0024-0000-0000-000000000024', 'Guillaume & Émilie', 'Montréalais, Plateau-Mont-Royal. Lifestyle depuis 3 ans, très ouverts, vraiment bienveillants. Come as you are.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80', 'guillaume.emilie@konnexyon.demo', 'hetero', 'bi', ARRAY['echangisme','rencontres_occasionnelles'], ARRAY['preservatif','discretion'], 5735, true, 'active', 'premium', NOW()),

('11111111-0025-0000-0000-000000000025', 'Antoine & Marie-Pier', 'Rosemont, Montréal. Couple libre depuis 1 an. Débutants enthousiastes qui prennent leur temps.', 'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=600&q=80', 'antoine.mariepier@konnexyon.demo', 'hetero', 'hetero', ARRAY['decouverte','rencontres_occasionnelles'], ARRAY['preservatif'], 5740, true, 'active', 'free', NOW()),

('11111111-0026-0000-0000-000000000026', 'Xavier & Isabelle', 'Laval/Montréal. Lifestyle 5+ ans. On aime les soirées entre couples cool, les discussions profondes et la bonne humeur.', 'https://images.unsplash.com/photo-1529360829904-80c13a267038?w=600&q=80', 'xavier.isabelle@konnexyon.demo', 'bi', 'bi', ARRAY['echangisme','expert'], ARRAY['discretion','preservatif','pas_contact_hors_site'], 5742, true, 'active', 'premium', NOW()),

-- Québec — Québec Ville
('11111111-0027-0000-0000-000000000027', 'François & Anne', 'Vieux-Québec, couple de 40 ans. Lifestyle discret depuis 6 ans. Qualité, respect, bonne humeur.', 'https://images.unsplash.com/photo-1518577915332-c2a19f149a75?w=600&q=80', 'francois.anne@konnexyon.demo', 'hetero', 'hetero', ARRAY['echangisme','rencontres_occasionnelles'], ARRAY['discretion','preservatif'], 5843, true, 'active', 'free', NOW()),

-- France — Tours
('11111111-0028-0000-0000-000000000028', 'Damien & Laura', 'Val de Loire, douceur de vivre et libertinage tranquille. Couple de 35 ans, stable et ouvert.', 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=600&q=80', 'damien.laura@konnexyon.demo', 'hetero', 'bi', ARRAY['rencontres_ocasionnelles','decouverte'], ARRAY['preservatif','discretion'], 244, true, 'active', 'free', NOW()),

-- France — Metz
('11111111-0029-0000-0000-000000000029', 'Alexis & Pauline', 'Mosellans à la croisée des cultures. Couple curieux, discret, et sincèrement bienveillant.', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80', 'alexis.pauline@konnexyon.demo', 'hetero', 'hetero', ARRAY['decouverte','rencontres_occasionnelles'], ARRAY['discretion','preservatif'], 333, true, 'active', 'premium', NOW()),

-- France — Dijon
('11111111-0030-0000-0000-000000000030', 'Victor & Emma', 'Bourguignons épicuriens. Entre pinot noir et liberté, on cherche des couples qui aiment la vie vraiment.', 'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=600&q=80', 'victor.emma@konnexyon.demo', 'bi', 'hetero', ARRAY['echangisme','rencontres_occasionnelles'], ARRAY['preservatif','pas_photo'], 311, true, 'active', 'free', NOW())

ON CONFLICT (id) DO NOTHING;
