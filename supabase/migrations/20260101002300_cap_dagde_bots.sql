-- ============================================================
-- 3 bots "couples" au Cap d'Agde + auto-réponse
-- ============================================================
-- Des profils bots qui apparaissent en découverte et répondent automatiquement
-- quand on leur écrit (utile pour tester / animer l'app au démarrage).

-- 1) Marqueur bot
alter table public.profiles add column if not exists is_bot boolean not null default false;

-- 2) Comptes auth des bots (service_role requis — SQL editor OK)
do $$
declare
  u uuid;
  ids uuid[] := array[
    '22222222-0001-0000-0000-000000000001'::uuid,
    '22222222-0002-0000-0000-000000000002'::uuid,
    '22222222-0003-0000-0000-000000000003'::uuid
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

-- 3) Profils bots (Cap d'Agde ~ 43.28 N, 3.51 E), avatars réalistes
insert into public.profiles (
  id, couple_name, bio, avatar_url, email_1, orientation,
  seeking, limits, max_distance_km, email_1_confirmed, status, visibility,
  is_bot, location, location_updated_at, created_at
) values
('22222222-0001-0000-0000-000000000001','Julie & Marc',
 'Habitués du Cap d''Agde, on adore l''ambiance du village naturiste. Ouverts, joueurs et bienveillants 🌊',
 'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=600&q=80',
 'julie.marc@konnexyon.demo','hetero_bi',
 array['echangisme','rencontres_occasionnelles'],array['discretion','preservatif'],80,
 true,'active','public',true,
 ST_SetSRID(ST_MakePoint(3.5136,43.2803),4326),now(),now()),
('22222222-0002-0000-0000-000000000002','Sophie & Lucas',
 'Le Cap, le soleil et la liberté. On aime rencontrer d''autres couples autour d''un verre en front de mer ☀️',
 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
 'sophie.lucas@konnexyon.demo','bi_all',
 array['rencontres_occasionnelles','decouverte'],array['preservatif'],90,
 true,'active','public',true,
 ST_SetSRID(ST_MakePoint(3.5160,43.2820),4326),now(),now()),
('22222222-0003-0000-0000-000000000003','Camille & Hugo',
 'En résidence au Cap d''Agde tout l''été. Curieux, discrets et toujours partants pour de belles rencontres 🔥',
 'https://images.unsplash.com/photo-1518577915332-c2a19f149a75?w=600&q=80',
 'camille.hugo@konnexyon.demo','hetero_bi',
 array['echangisme','rencontres_occasionnelles','decouverte'],array['discretion','preservatif'],100,
 true,'active','public',true,
 ST_SetSRID(ST_MakePoint(3.5110,43.2790),4326),now(),now())
on conflict (id) do nothing;

-- 4) Realtime sur messages (pour que la réponse du bot s'affiche en direct)
alter table public.messages replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

-- 5) Auto-réponse : quand on écrit à un bot, il répond
create or replace function public.bot_autoreply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  other_id uuid;
  reply text;
begin
  -- ne pas répondre à un message envoyé par un bot (évite la boucle)
  if exists (select 1 from public.profiles where id = new.sender_id and is_bot) then
    return new;
  end if;
  -- l'autre membre du match
  select case when m.couple_a = new.sender_id then m.couple_b else m.couple_a end
    into other_id
  from public.matches m where m.id = new.match_id;
  -- répondre seulement si l'autre membre est un bot
  if not exists (select 1 from public.profiles where id = other_id and is_bot) then
    return new;
  end if;
  reply := (array[
    'Coucou ! Ravis de te lire 😏',
    'Hmm intéressant… dites-nous en plus 🔥',
    'On adore le Cap d''Agde, et vous ?',
    'Vous cherchez quoi exactement ? 😈',
    'On est plutôt libres ce week-end 😉',
    'Vos photos nous plaisent beaucoup…',
    'Un verre en front de mer, ça vous dit ? ☀️'
  ])[floor(random()*7 + 1)];
  insert into public.messages (match_id, sender_id, content)
  values (new.match_id, other_id, reply);
  return new;
end;
$$;

drop trigger if exists on_message_bot_reply on public.messages;
create trigger on_message_bot_reply
  after insert on public.messages
  for each row execute function public.bot_autoreply();
