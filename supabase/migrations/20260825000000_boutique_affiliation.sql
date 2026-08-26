-- ============================================================
-- LA PAPETERIE PASSE EN AFFILIATION
--
-- Plus de stock, plus de caisse, plus de livraison : on selectionne
-- des articles chez des marchands partenaires, on renvoie chez eux, et
-- la commission tombe sur la vente. Le site ne manipule ni paiement ni
-- donnee de livraison - ce qui retire au passage tout le risque
-- reglementaire qui allait avec.
--
-- Les commandes disparaissent donc. Elles n'ont jamais servi : la
-- boutique n'a pas encore ouvert.
-- ============================================================

-- ============================================================
-- 1. LE CATALOGUE DEVIENT UNE SELECTION
-- ============================================================

alter table public.products
  add column if not exists merchant        text,
  add column if not exists affiliate_url   text,
  add column if not exists commission_rate numeric(5,2);

do $$
begin
  -- une commission se lit en pourcentage : 4.50 vaut 4,5 %
  if not exists (select 1 from pg_constraint where conname = 'products_commission_rate_range') then
    alter table public.products
      add constraint products_commission_rate_range
      check (commission_rate is null or (commission_rate >= 0 and commission_rate <= 100));
  end if;

  -- un lien d'affiliation sort du site : on n'accepte que du https
  if not exists (select 1 from pg_constraint where conname = 'products_affiliate_url_https') then
    alter table public.products
      add constraint products_affiliate_url_https
      check (affiliate_url is null or affiliate_url ~ '^https://');
  end if;
end $$;

-- le prix devient indicatif : c'est le marchand qui fixe le sien
comment on column public.products.price_cents is
  'Prix indicatif releve chez le marchand. Le prix qui fait foi est le sien, au moment du clic.';

-- plus rien a stocker
alter table public.products drop column if exists stock;

-- ============================================================
-- 2. LES COMMANDES N'ONT PLUS D'OBJET
-- ============================================================

drop table if exists public.order_items cascade;
drop table if exists public.orders      cascade;

-- ============================================================
-- 3. MESURER CE QUI PART
--
-- Sans commande, la seule chose observable de notre cote est le clic
-- sortant. C'est lui qui dit quels articles meritent leur place.
-- ============================================================

create table if not exists public.product_clicks (
  id         uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists product_clicks_product_idx
  on public.product_clicks (product_id, created_at desc);

alter table public.product_clicks enable row level security;
-- aucune policy : on n'ecrit que par la fonction ci-dessous, on ne lit
-- que par le service_role. Un visiteur n'a pas a consulter le trafic.

-- Enregistre un depart vers le marchand. En security definer pour que
-- le visiteur, connecte ou non, puisse la declencher sans droit sur la
-- table. Silencieuse a dessein : un clic perdu ne doit jamais empecher
-- le depart vers la boutique du marchand.
create or replace function public.enregistrer_clic(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id from public.products where slug = p_slug and is_active;
  if v_id is null then return; end if;
  insert into public.product_clicks (product_id, user_id) values (v_id, auth.uid());
exception when others then
  return;
end;
$$;

grant execute on function public.enregistrer_clic(text) to anon, authenticated;

-- ============================================================
-- 4. CE QUI PART LE PLUS, POUR l'ADMIN
-- ============================================================

create or replace function public.clics_par_article(p_depuis timestamptz default now() - interval '30 days')
returns table (slug text, name text, merchant text, commission_rate numeric, clics bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.slug, p.name, p.merchant, p.commission_rate, count(c.id)
  from public.products p
  left join public.product_clicks c
         on c.product_id = p.id and c.created_at >= p_depuis
  where public.is_admin()
  group by p.slug, p.name, p.merchant, p.commission_rate
  order by count(c.id) desc, p.name;
$$;
