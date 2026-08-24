-- ============================================================
-- DROITS DE TABLE MANQUANTS
--
-- Supabase accorde d'ordinaire les privileges DML aux roles anon et
-- authenticated sur les tables creees dans public. Ca n'a pas pris sur
-- celles de la bascule : elles n'avaient recu que REFERENCES, TRIGGER
-- et TRUNCATE.
--
-- Sans GRANT, la RLS n'est meme pas consultee : Postgres refuse avant,
-- avec " permission denied for table ". Les policies etaient donc
-- correctes depuis le debut, mais inatteignables.
-- ============================================================

-- le mot du jour se lit, ne s'ecrit pas (l'admin passe par service_role)
grant select                         on public.daily_words     to authenticated;

-- chacun ecrit sa ligne, ses reponses et ses traits ; la RLS restreint
-- ensuite a ses propres enregistrements
grant select, insert, update, delete on public.word_responses  to authenticated;
grant select, insert, update, delete on public.profile_answers to authenticated;
grant select, insert, update, delete on public.profile_traits  to authenticated;

-- la boutique : catalogue lisible par tous, commandes reservees au client
grant select          on public.products    to anon, authenticated;
grant select, insert  on public.orders      to authenticated;
grant select, insert  on public.order_items to authenticated;

-- ============================================================
-- LES ARCHIVES RESTENT FERMEES
--
-- Elles contiennent des donnees de membres supprimes : aucune policy,
-- et surtout aucun droit. Lecture reservee au service_role.
-- ============================================================

revoke all on public.archive_profils_couple    from anon, authenticated;
revoke all on public.archive_comptes_supprimes from anon, authenticated;
