-- ============================================================
-- LES SESSIONS ANONYMES NE PEUVENT RIEN ECRIRE
--
-- Activer les connexions anonymes donne aux visiteurs le role
-- "authenticated" : toutes les politiques ecrites pour les membres
-- s appliquent desormais a eux. La cle publique etant, par nature,
-- dans le code du site, n importe qui pouvait ouvrir une session
-- anonyme et ecrire des lignes, poser des connexions, envoyer des
-- messages.
--
-- On ferme d abord, on ouvrira ensuite, precisement, ce que
-- l ecriture sans compte demande.
--
-- Le verrou est pose en RESTRICTIVE : ces politiques se combinent aux
-- existantes par un ET. Nul besoin de connaitre chaque regle deja
-- ecrite pour etre certain du resultat, et rien n est retire a un
-- membre veritable.
-- ============================================================

begin;

-- Lisible, et testable seule : select public.est_anonyme();
create or replace function public.est_anonyme()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

grant execute on function public.est_anonyme() to anon, authenticated;

do $$
declare
  v_table text;
  v_nom   text;
begin
  foreach v_table in array array[
    'likes', 'messages', 'matches', 'blocks',
    'profiles', 'profile_answers', 'profile_traits', 'word_responses'
  ] loop
    -- une table absente n est pas une erreur : le schema a bouge
    if to_regclass('public.' || v_table) is null then
      raise notice 'table % absente, ignoree', v_table;
      continue;
    end if;

    v_nom := 'anonyme_lecture_seule';
    execute format('drop policy if exists %I on public.%I', v_nom, v_table);
    execute format($f$
      create policy %I on public.%I
      as restrictive
      for all
      to authenticated
      using (not public.est_anonyme())
      with check (not public.est_anonyme())
    $f$, v_nom, v_table);
  end loop;
end $$;

commit;

-- Controle : une ligne par table protegee.
select tablename, policyname, permissive
from pg_policies
where schemaname = 'public' and policyname = 'anonyme_lecture_seule'
order by tablename;
