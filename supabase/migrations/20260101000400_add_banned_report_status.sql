-- Ajout de la valeur 'banned' dans l'enum report_status
-- Cette valeur est utilisée dans le panneau Admin pour bannir un profil signalé
ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'banned';
