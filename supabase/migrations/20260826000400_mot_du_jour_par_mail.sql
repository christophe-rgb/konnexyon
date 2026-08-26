-- ============================================================
-- LE MOT DU JOUR PAR COURRIEL
--
-- Chaque matin, le nouveau mot part chez les membres. C est ce qui
-- ramene : sans rappel, un site qui se joue une fois par jour se perd.
--
-- Trois exigences tiennent dans cette migration :
--   - un desabonnement en un clic, sans mot de passe ni compte a
--     retrouver. Un envoi quotidien sans porte de sortie n est pas
--     legal, et de toute facon c est le meilleur moyen d etre signale
--     comme indesirable ;
--   - aucun double envoi, meme si le declencheur passe deux fois ;
--   - les robots sont exclus : ils n ont pas de vraie adresse.
-- ============================================================

alter table public.profiles
  add column if not exists mot_du_jour_email boolean not null default true,
  add column if not exists desabo_token text;

-- Un jeton par membre, pour se desabonner depuis le courriel sans avoir
-- a se connecter. Impossible a deviner, sans valeur s il fuite : il ne
-- permet que de se retirer d une liste.
update public.profiles
set desabo_token = encode(gen_random_bytes(16), 'hex')
where desabo_token is null;

alter table public.profiles
  alter column desabo_token set default encode(gen_random_bytes(16), 'hex');

create unique index if not exists profiles_desabo_token_idx
  on public.profiles (desabo_token);

comment on column public.profiles.mot_du_jour_email is
  'Recoit le mot du jour par courriel. Se coupe depuis les parametres ou depuis le lien de desabonnement.';

-- ============================================================
-- TRACE DES ENVOIS
--
-- Un envoi par membre et par mot : la cle primaire suffit a empecher
-- le double envoi si le declencheur passe deux fois.
-- ============================================================

create table if not exists public.envois_mot_du_jour (
  daily_word_id uuid not null references public.daily_words(id) on delete cascade,
  user_id       uuid not null references public.profiles(id)    on delete cascade,
  envoye_le     timestamptz not null default now(),
  primary key (daily_word_id, user_id)
);

alter table public.envois_mot_du_jour enable row level security;
-- aucune policy : seul le service_role ecrit et lit cette table

-- ============================================================
-- SE DESABONNER
--
-- Accessible sans compte : le lien du courriel doit marcher meme si la
-- personne n est plus connectee, ou ne se souvient plus de son mot de
-- passe. C est tout l interet du jeton.
-- ============================================================

create or replace function public.desabonner_mot_du_jour(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_prenom text;
begin
  if p_token is null or length(p_token) < 16 then
    return json_build_object('ok', false);
  end if;

  update public.profiles
  set mot_du_jour_email = false
  where desabo_token = p_token
  returning display_name into v_prenom;

  if v_prenom is null then
    return json_build_object('ok', false);
  end if;
  return json_build_object('ok', true, 'prenom', v_prenom);
end;
$$;

grant execute on function public.desabonner_mot_du_jour(text) to anon, authenticated;
