-- ============================================================
-- Musique : agrandir la limite de taille (50 Mo) et ne plus
-- rejeter selon le type MIME (certains fichiers audio arrivent
-- avec un type absent ou non standard). Bucket admin-only en
-- écriture (dossier {uid}/), donc autoriser tous les types est sûr.
-- ============================================================
update storage.buckets
set file_size_limit = 52428800,   -- 50 Mo
    allowed_mime_types = null      -- null = tous les types acceptés
where id = 'music';
