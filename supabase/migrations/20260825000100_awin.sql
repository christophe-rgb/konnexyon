-- ============================================================
-- AWIN : l'identifiant du marchand sur chaque article
--
-- Un lien Awin s'assemble a partir de trois elements : notre
-- identifiant d'editeur (le meme partout, garde dans l'environnement),
-- l'identifiant du marchand, et l'adresse de destination.
--
-- On ne stocke donc pas le lien tout fait mais ses deux parties
-- variables : affiliate_url porte l'adresse du produit chez le
-- marchand, awin_mid l'identifiant de l'enseigne. Le lien se construit
-- a l'affichage - si l'identifiant d'editeur change, rien a remigrer.
-- ============================================================

alter table public.products
  add column if not exists awin_mid text;

do $$
begin
  -- un identifiant Awin est numerique
  if not exists (select 1 from pg_constraint where conname = 'products_awin_mid_numerique') then
    alter table public.products
      add constraint products_awin_mid_numerique
      check (awin_mid is null or awin_mid ~ '^[0-9]+$');
  end if;
end $$;

comment on column public.products.awin_mid is
  'Identifiant Awin du marchand (awinmid). Vide pour une enseigne qui gere son affiliation en direct : le lien de affiliate_url est alors utilise tel quel.';

comment on column public.products.affiliate_url is
  'Adresse du produit chez le marchand. Sert de destination au lien Awin quand awin_mid est renseigne, sinon de lien direct.';
