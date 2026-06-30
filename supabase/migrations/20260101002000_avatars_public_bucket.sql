-- ============================================================
-- Réconciliation : bucket "avatars" public
-- ============================================================
-- Le code affiche les avatars via supabase.storage.getPublicUrl() (onboarding,
-- useProfileActions), ce qui n'est servi que si le bucket est PUBLIC. La
-- migration de sécurité l'avait passé en privé → les photos de profil ne
-- s'affichaient pas (URL publique sur bucket privé = 400). On rétablit le
-- bucket avatars en public (les avatars sont de toute façon visibles de tous
-- les couples en découverte). Le bucket chat-photos reste privé (URLs signées).
update storage.buckets set public = true where id = 'avatars';
