-- ============================================================
-- FIX SÉCURITÉ CRITIQUE — profiles_update
-- ============================================================
-- Problème : la policy "profiles_update" ne contrôlait que `using (id = auth.uid())`
-- sans WITH CHECK. Un utilisateur authentifié pouvait donc modifier librement
-- ses colonnes `plan`, `plan_expires_at` et `status` via l'API REST Supabase
-- (PostgREST), s'octroyant un abonnement Premium gratuit → fuite de revenus.
--
-- Une policy RLS ne peut PAS comparer NEW vs OLD (pas d'accès à la ligne
-- existante dans WITH CHECK). On verrouille donc ces colonnes sensibles via
-- un TRIGGER BEFORE UPDATE qui réécrit toute tentative de modification par
-- un utilisateur normal. Seul le rôle `service_role` (clé serveur, webhooks
-- Segpay, fonctions edge) peut modifier ces champs.
-- ============================================================

-- 1) On garde la policy update telle quelle (filtre sur la propriété de la ligne)
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- 2) Trigger de verrouillage des colonnes monétisées / de statut
create or replace function public.lock_sensitive_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Le rôle service_role (back-office, webhooks Segpay, edge functions) a tous les droits
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Pour tout autre rôle (utilisateur authentifié via PostgREST),
  -- on force les colonnes sensibles à conserver leur ancienne valeur.
  new.plan            := old.plan;
  new.plan_expires_at := old.plan_expires_at;
  new.status          := old.status;

  return new;
end;
$$;

drop trigger if exists trg_lock_sensitive_profile_columns on public.profiles;
create trigger trg_lock_sensitive_profile_columns
  before update on public.profiles
  for each row
  execute function public.lock_sensitive_profile_columns();
