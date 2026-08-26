/**
 * La Papeterie — une sélection, pas un stock.
 *
 * Le modèle est l'affiliation : on choisit des objets chez des marchands
 * partenaires, on renvoie chez eux, et la commission tombe sur la vente.
 * Le site ne détient aucun stock, n'encaisse rien et n'expédie rien.
 *
 * Le catalogue vit dans Supabase (table products). CATALOGUE ci-dessous en
 * est la copie de secours : la boutique doit rester lisible même si la base
 * ne répond pas, parce qu'une page produit vide sur du trafic payant, c'est
 * du budget publicitaire jeté.
 *
 * Chaque article porte `merchant`, `affiliate_url` et `commission_rate`.
 * Tant que le lien manque, l'article s'affiche sans bouton d'achat plutôt
 * que de mener nulle part.
 */

export const CATALOGUE = [
  {
    slug: 'necessaire-a-lettres',
    name: 'Le Nécessaire à lettres',
    tagline: 'Tout ce qu’il faut pour écrire à quelqu’un.',
    description:
      'Un sceau de cire à votre initiale, six bâtons de cire ivoire, un porte-plume en bois tourné, un encrier d’encre noire, dix cartes et dix enveloppes en coton. Présenté dans un coffret toilé. C’est le geste complet, du premier mot au cachet.',
    price_cents: 6800, compare_cents: 8500,
    category: 'kit', plate: 'necessaire', rank: 10,
    detail: ['Sceau en laiton, initiale gravée', 'Six bâtons de cire ivoire', 'Porte-plume + encrier 30 ml', 'Dix cartes, dix enveloppes coton', 'Coffret toilé ivoire'],
  },
  {
    slug: 'carnet-du-mot-du-jour',
    name: 'Le Carnet du Mot du jour',
    tagline: 'Une ligne par jour, trois cent soixante-cinq fois.',
    description:
      'Le pendant papier de votre carnet Konnexyon. Une page par jour : le mot en haut, une seule ligne à remplir en dessous. Papier ivoire 120 g, ouverture à plat, signet doré. Ce que vous écrivez sur l’écran, vous pouvez le réécrire ici — c’est le même geste, en plus lent.',
    price_cents: 3200, compare_cents: null,
    category: 'carnet', plate: 'carnet', rank: 20,
    detail: ['365 pages datées', 'Papier ivoire 120 g', 'Ouverture à plat, reliure cousue', 'Signet doré', 'Format 14 × 21 cm'],
  },
  {
    slug: 'cartes-questions',
    name: 'Les Cartes-questions',
    tagline: 'Cinquante-deux questions, aucune réponse facile.',
    description:
      'Les questions de Konnexyon, imprimées sur cinquante-deux cartes au format jeu. « Une chose que tu ne dis presque jamais. » « Quelle phrase pourrait te faire changer d’avis ? » À tirer seul devant une page blanche, ou à deux, à voix haute.',
    price_cents: 2400, compare_cents: null,
    category: 'carnet', plate: 'cartes', rank: 30,
    detail: ['52 cartes, 300 g pelliculé mat', 'Tranches dorées', 'Étui rigide', 'Format 6,3 × 8,8 cm'],
  },
  {
    slug: 'sceau-konnexyon',
    name: 'Le Sceau',
    tagline: 'Votre initiale, dans la cire.',
    description:
      'Sceau en laiton massif monté sur manche de noyer, gravé à l’initiale de votre choix. Livré avec vingt bâtons de cire — noir d’encre, ivoire ou or. La cire fond en quarante secondes et tient des années.',
    price_cents: 2900, compare_cents: null,
    category: 'ecriture', plate: 'sceau', rank: 40,
    detail: ['Laiton massif, manche noyer', 'Initiale au choix (A–Z)', 'Vingt bâtons de cire', 'Trois teintes : encre, ivoire, or'],
  },
  {
    slug: 'porte-plume-et-encre',
    name: 'Le Porte-plume & l’encre',
    tagline: 'La main ralentit, la phrase change.',
    description:
      'Porte-plume en bois tourné, trois becs de rechange, et un encrier de trente millilitres d’encre noire. Écrire à la plume oblige à savoir où l’on va avant de poser le mot — c’est exactement le point.',
    price_cents: 4400, compare_cents: null,
    category: 'ecriture', plate: 'plume', rank: 50,
    detail: ['Porte-plume bois tourné', 'Trois becs de rechange', 'Encrier 30 ml, encre noire', 'Repose-plume en laiton'],
  },
  {
    slug: 'encre-d-or',
    name: 'L’Encre d’or',
    tagline: 'Pour la phrase qui compte.',
    description:
      'Trente millilitres d’encre dorée à particules, à agiter avant usage. Sur le papier ivoire, elle accroche la lumière. À réserver aux quelques lignes qui le méritent.',
    price_cents: 1800, compare_cents: null,
    category: 'ecriture', plate: 'encre', rank: 60,
    detail: ['30 ml', 'Particules d’or, à agiter', 'Compatible plume et porte-plume', 'Séchage 40 secondes'],
  },
  {
    slug: 'papier-a-lettres',
    name: 'Le Papier à lettres',
    tagline: 'Quarante feuilles, vingt enveloppes.',
    description:
      'Papier de coton ivoire 120 g, non ligné, filigrané à la plume. Vingt enveloppes doublées assorties. La recharge du Nécessaire — parce qu’on écrit plus qu’on ne le croyait.',
    price_cents: 2200, compare_cents: null,
    category: 'papier', plate: 'papier', rank: 70,
    detail: ['40 feuilles coton 120 g', '20 enveloppes doublées', 'Filigrane à la plume', 'Format A5'],
  },
  {
    slug: 'abonnement-correspondance',
    name: 'L’Abonnement Correspondance',
    tagline: 'Chaque mois, de quoi écrire à quelqu’un.',
    description:
      'Le premier de chaque mois, une enveloppe arrive : du papier, une encre ou une cire, et une carte-question inédite qui n’existe nulle part ailleurs. Sans engagement, résiliable en un clic.',
    price_cents: 2400, compare_cents: null,
    category: 'abonnement', plate: 'abonnement', rank: 80,
    detail: ['Envoi le 1er de chaque mois', 'Papier + encre ou cire', 'Une carte-question inédite', 'Sans engagement'],
  },
]

export const RAYONS = [
  { key: 'tout',       label: 'Tout' },
  { key: 'kit',        label: 'Nécessaires' },
  { key: 'carnet',     label: 'Carnets' },
  { key: 'ecriture',   label: 'Écriture' },
  { key: 'papier',     label: 'Papier' },
  { key: 'abonnement', label: 'Abonnement' },
]

/**
 * Mention légale d'affiliation.
 *
 * La transparence sur les liens rémunérés est une obligation, pas une
 * politesse : elle doit être visible avant le clic, pas enfouie dans les
 * mentions légales. Ce texte est affiché en tête de boutique et sur
 * chaque fiche.
 */
export const MENTION_AFFILIATION =
  'Les articles présentés sont vendus par des marchands partenaires. ' +
  'Konnexyon touche une commission sur les achats effectués depuis ces liens, ' +
  'sans que cela change le prix payé.'

export function euros(cents) {
  return (cents / 100).toLocaleString('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })
}

export function bySlug(slug) {
  return CATALOGUE.find(p => p.slug === slug) || null
}

/**
 * Le lien sortant d'un article, s'il est utilisable.
 *
 * On n'ouvre que du https : un lien d'affiliation vient d'un fichier de
 * configuration ou de la base, et un `javascript:` glissé là s'exécuterait
 * dans la page au clic.
 */
export function lienSortant(produit) {
  const url = produit?.affiliate_url
  if (typeof url !== 'string') return null
  try {
    return new URL(url).protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

/** Un article est-il achetable, c'est-à-dire relié à un marchand ? */
export function estDisponible(produit) {
  return !!lienSortant(produit)
}

/** « chez Papersmiths », ou rien si le marchand n'est pas renseigné. */
export function chezLeMarchand(produit) {
  return produit?.merchant ? `chez ${produit.merchant}` : ''
}

/**
 * Ce que rapporte une vente, en centimes.
 * Sert au suivi interne — jamais affiché au visiteur.
 */
export function commissionCents(produit) {
  const taux = Number(produit?.commission_rate)
  const prix = Number(produit?.price_cents)
  if (!Number.isFinite(taux) || !Number.isFinite(prix)) return 0
  if (taux <= 0 || prix <= 0) return 0
  return Math.round((prix * Math.min(taux, 100)) / 100)
}
