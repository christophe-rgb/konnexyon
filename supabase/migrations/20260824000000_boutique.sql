-- ============================================================
-- LA PAPETERIE — la boutique de Konnexyon
--
--   • products     : le catalogue (lecture publique)
--   • orders       : une commande par passage en caisse
--   • order_items  : le detail, fige au prix du jour de la commande
--
-- Principe : le catalogue est public en lecture, ecrit uniquement par
-- le service_role (import produit / back-office). Les commandes sont
-- privees : chacun ne voit que les siennes, et ne peut jamais les
-- modifier apres coup — seul le webhook de paiement (service_role)
-- fait avancer le statut.
--
-- Aucune migration existante n'est modifiee.
-- ============================================================

-- ============================================================
-- CATALOGUE
-- ============================================================

create table if not exists public.products (
  id           uuid primary key default uuid_generate_v4(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name         text not null check (char_length(name) between 1 and 120),
  tagline      text,
  description  text,
  -- centimes : jamais de flottant sur de l'argent
  price_cents  integer not null check (price_cents >= 0),
  compare_cents integer check (compare_cents is null or compare_cents > price_cents),
  currency     text not null default 'EUR' check (currency = 'EUR'),
  -- 'kit' | 'carnet' | 'ecriture' | 'papier' | 'abonnement'
  category     text not null,
  -- cle de l'illustration SVG cote client (src/components/boutique/Plates.jsx)
  plate        text not null,
  -- null = stock non suivi (abonnement, print on demand)
  stock        integer check (stock is null or stock >= 0),
  -- ordre d'affichage en rayon, petit = en tete
  rank         integer not null default 100,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists products_active_rank_idx
  on public.products (is_active, rank, created_at);

alter table public.products enable row level security;

-- le rayon est public : on peut lire le catalogue sans compte
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select using (is_active = true);

-- ============================================================
-- COMMANDES
-- ============================================================

create table if not exists public.orders (
  id             uuid primary key default uuid_generate_v4(),
  -- null = commande invitee (achat sans compte Konnexyon)
  user_id        uuid references public.profiles(id) on delete set null,
  email          text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- 'en_attente' | 'payee' | 'expediee' | 'annulee' | 'remboursee'
  status         text not null default 'en_attente'
                 check (status in ('en_attente','payee','expediee','annulee','remboursee')),
  total_cents    integer not null check (total_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  currency       text not null default 'EUR',
  -- adresse figee au moment de la commande (jsonb : elle ne doit pas
  -- suivre les modifications ulterieures du profil)
  shipping       jsonb,
  -- identifiant de session Stripe Checkout, pose par la fonction edge
  payment_ref    text unique,
  -- d'ou vient la commande : utm de la campagne Meta / TikTok
  source         text,
  created_at     timestamptz not null default now(),
  paid_at        timestamptz
);

create index if not exists orders_user_idx
  on public.orders (user_id, created_at desc);

alter table public.orders enable row level security;

-- je ne vois que mes commandes
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (user_id = auth.uid());

-- je peux creer une commande, uniquement a mon nom et uniquement
-- en attente de paiement : le montant paye n'est jamais decide client.
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert with check (
    user_id = auth.uid()
    and status = 'en_attente'
    and paid_at is null
  );

-- pas de policy update ni delete : une fois posee, une commande
-- n'est plus touchee que par le service_role (webhook de paiement).

-- ============================================================
-- LIGNES DE COMMANDE
-- ============================================================

create table if not exists public.order_items (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references public.orders(id)   on delete cascade,
  product_id    uuid not null references public.products(id) on delete restrict,
  -- nom et prix recopies : le catalogue peut changer, pas la facture
  name_snapshot text not null,
  unit_cents    integer not null check (unit_cents >= 0),
  quantity      integer not null check (quantity between 1 and 20),
  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_idx
  on public.order_items (order_id);

alter table public.order_items enable row level security;

-- je lis les lignes des commandes qui sont a moi
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
        and o.status = 'en_attente'
    )
  );

-- ============================================================
-- CATALOGUE DE DEPART
--
-- Les prix suivent le marche francais de la papeterie premium
-- (Papier, Mark+Fold, Katie Leamon) : positionnement cadeau,
-- pas positionnement fourniture.
-- ============================================================

insert into public.products
  (slug, name, tagline, description, price_cents, compare_cents, category, plate, stock, rank)
values
  ('necessaire-a-lettres',
   'Le Nécessaire à lettres',
   'Tout ce qu''il faut pour écrire à quelqu''un.',
   'Un sceau de cire à votre initiale, six bâtons de cire ivoire, un porte-plume en bois tourné, un encrier d''encre noire, dix cartes et dix enveloppes en coton. Présenté dans un coffret toilé. C''est le geste complet, du premier mot au cachet.',
   6800, 8500, 'kit', 'necessaire', 120, 10),

  ('carnet-du-mot-du-jour',
   'Le Carnet du Mot du jour',
   'Une ligne par jour, trois cent soixante-cinq fois.',
   'Le pendant papier de votre carnet Konnexyon. Une page par jour : le mot en haut, une seule ligne à remplir en dessous. Papier ivoire 120 g, ouverture à plat, signet doré. Ce que vous écrivez sur l''écran, vous pouvez le réécrire ici — c''est le même geste, en plus lent.',
   3200, null, 'carnet', 'carnet', 200, 20),

  ('cartes-questions',
   'Les Cartes-questions',
   'Cinquante-deux questions, aucune réponse facile.',
   'Les questions de Konnexyon, imprimées sur cinquante-deux cartes au format jeu. « Une chose que tu ne dis presque jamais. » « Quelle phrase pourrait te faire changer d''avis ? » À tirer seul devant une page blanche, ou à deux, à voix haute.',
   2400, null, 'carnet', 'cartes', 300, 30),

  ('sceau-konnexyon',
   'Le Sceau',
   'Votre initiale, dans la cire.',
   'Sceau en laiton massif monté sur manche de noyer, gravé à l''initiale de votre choix. Livré avec vingt bâtons de cire — noir d''encre, ivoire ou or. La cire fond en quarante secondes et tient des années.',
   2900, null, 'ecriture', 'sceau', 250, 40),

  ('porte-plume-et-encre',
   'Le Porte-plume & l''encre',
   'La main ralentit, la phrase change.',
   'Porte-plume en bois tourné, trois becs de rechange, et un encrier de trente millilitres d''encre noire. Écrire à la plume oblige à savoir où l''on va avant de poser le mot — c''est exactement le point.',
   4400, null, 'ecriture', 'plume', 140, 50),

  ('encre-d-or',
   'L''Encre d''or',
   'Pour la phrase qui compte.',
   'Trente millilitres d''encre dorée à particules, à agiter avant usage. Sur le papier ivoire, elle accroche la lumière. À réserver aux quelques lignes qui le méritent.',
   1800, null, 'ecriture', 'encre', 400, 60),

  ('papier-a-lettres',
   'Le Papier à lettres',
   'Quarante feuilles, vingt enveloppes.',
   'Papier de coton ivoire 120 g, non ligné, filigrané à la plume. Vingt enveloppes doublées assorties. La recharge du Nécessaire — parce qu''on écrit plus qu''on ne le croyait.',
   2200, null, 'papier', 'papier', 500, 70),

  ('abonnement-correspondance',
   'L''Abonnement Correspondance',
   'Chaque mois, de quoi écrire à quelqu''un.',
   'Le premier de chaque mois, une enveloppe arrive : du papier, une encre ou une cire, et une carte-question inédite qui n''existe nulle part ailleurs. Sans engagement, résiliable en un clic.',
   2400, null, 'abonnement', 'abonnement', null, 80)
on conflict (slug) do nothing;
