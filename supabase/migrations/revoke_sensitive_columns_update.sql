-- SEC-002 : Empêcher les utilisateurs authentifiés de modifier les colonnes sensibles du profil
-- via un UPDATE direct (defense-in-depth en complément du whitelist côté application).

REVOKE UPDATE (is_premium, plan, stripe_customer_id, role) ON public.profiles FROM authenticated;
