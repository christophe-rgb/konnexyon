-- SEC-002 : Empêcher les utilisateurs authentifiés de modifier les colonnes sensibles du profil
-- via un UPDATE direct (defense-in-depth en complément du whitelist côté application).

-- Revoke uniquement les colonnes qui existent réellement dans profiles
REVOKE UPDATE (plan, stripe_customer_id) ON public.profiles FROM authenticated;
