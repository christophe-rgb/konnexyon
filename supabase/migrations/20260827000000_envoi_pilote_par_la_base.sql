-- ============================================================
-- L ENVOI DU MOT DU JOUR, PILOTE PAR LA BASE
--
-- Supabase a change le format de ses cles de service : ni
-- SUPABASE_SERVICE_ROLE_KEY ni SUPABASE_SECRET_KEYS ne donnent plus
-- une cle qui contourne la RLS, et la fonction se heurtait a un
-- "permission denied for table daily_words".
--
-- Plutot que de courir apres la bonne cle, on retire le besoin : la
-- fonction n a plus aucun privilege. Elle appelle une procedure en
-- base, protegee par le meme secret partage, qui fait tout le travail
-- et rend seulement ce qu il faut pour poster les courriels.
--
-- Le secret vit dans une table sans policy : invisible depuis l API,
-- lisible seulement par les fonctions security definer.
--
-- La valeur reelle n est PAS dans ce fichier : elle a ete posee
-- directement en base, et doit correspondre au secret
-- MOT_DU_JOUR_SECRET des fonctions Edge. Un secret versionne dans git
-- est un secret perdu.
-- ============================================================

create table if not exists public.secrets_service (
  nom    text primary key,
  valeur text not null
);
alter table public.secrets_service enable row level security;
revoke all on public.secrets_service from anon, authenticated;

insert into public.secrets_service (nom, valeur)
values ('mot_du_jour', 'A_REMPLACER_PAR_LE_SECRET_REEL')
on conflict (nom) do update set valeur = excluded.valeur;

-- ============================================================
-- QUI DOIT RECEVOIR LE MOT, ET LA TRACE POSEE DANS LA FOULEE
--
-- La trace est ecrite ici, avant meme que le courriel parte : on
-- prefere un envoi manquant a un doublon. Deux appels rapproches ne
-- peuvent donc pas envoyer deux fois.
-- ============================================================

create or replace function public.mot_du_jour_a_envoyer(p_secret text)
returns table (mot text, email text, prenom text, jeton text)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_attendu text;
  v_mot_id  uuid;
  v_mot     text;
begin
  select valeur into v_attendu from public.secrets_service where nom = 'mot_du_jour';
  if v_attendu is null or p_secret is null or p_secret <> v_attendu then
    raise exception 'non autorise';
  end if;

  select w.id, w.word into v_mot_id, v_mot
  from public.daily_words w
  where w.publish_date <= current_date
  order by w.publish_date desc limit 1;

  if v_mot_id is null then return; end if;

  return query
  with destinataires as (
    select p.id, p.email_1, p.display_name, p.desabo_token
    from public.profiles p
    where p.status = 'active'
      and p.mot_du_jour_email
      and not p.is_bot
      and p.email_1 like '%@%'
      and not exists (
        select 1 from public.envois_mot_du_jour e
        where e.daily_word_id = v_mot_id and e.user_id = p.id
      )
  ),
  trace as (
    insert into public.envois_mot_du_jour (daily_word_id, user_id)
    select v_mot_id, d.id from destinataires d
    on conflict do nothing
    returning user_id
  )
  select v_mot, d.email_1, d.display_name, d.desabo_token
  from destinataires d
  join trace t on t.user_id = d.id;
end;
$fn$;

grant execute on function public.mot_du_jour_a_envoyer(text) to anon, authenticated;
