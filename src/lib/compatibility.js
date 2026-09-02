/**
 * Compatibilité intellectuelle.
 *
 * Seize questions, quatre thèmes. Chacune se répond sur une échelle de
 * 1 à 5 entre deux pôles — pas de bon ni de mauvais côté, juste un
 * penchant. Le score compare deux jeux de réponses.
 *
 * Le même calcul existe en SQL (public.compat_score) pour que les
 * réponses des autres n'aient jamais à transiter jusqu'au navigateur.
 * Les deux doivent rester d'accord : voir src/__tests__/compatibility.test.js.
 */

export const SCALE_MIN = 1
export const SCALE_MAX = 5

// en dessous, le score ne veut rien dire : on l'affiche « à compléter »
export const MIN_COMMON_ANSWERS = 8

export const TRAIT_SECTIONS = [
  {
    slug: 'qui_je_suis',
    title: 'Qui je suis',
    intro: 'Sans réfléchir. Le premier penchant est le bon.',
    questions: [
      { slug: 'soiree',  label: 'Une soirée qui me repose',  left: 'Seul, chez moi',            right: 'Entouré, dehors' },
      { slug: 'rythme',  label: 'Mon rythme',                left: 'Lent, je prends mon temps', right: 'Vif, j’aime que ça bouge' },
      { slug: 'humour',  label: 'Mon humour',                left: 'Pince-sans-rire',           right: 'Franc éclat de rire' },
      { slug: 'reserve', label: 'Ce que je laisse voir',     left: 'Je garde pour moi',         right: 'Je dis tout' },
    ],
  },
  {
    slug: 'mes_gouts',
    title: 'Mes goûts',
    intro: 'Ce vers quoi tu vas quand personne ne regarde.',
    questions: [
      { slug: 'lecture', label: 'Ce que je lis',      left: 'Romans et poésie',          right: 'Essais et enquêtes' },
      { slug: 'musique', label: 'Ce que j’écoute',    left: 'Une voix, une guitare',     right: 'Un mur de son' },
      { slug: 'cinema',  label: 'Ce que je regarde',  left: 'Ce qui prend son temps',    right: 'Ce qui empoigne' },
      { slug: 'ailleurs',label: 'Partir',             left: 'Toujours au même endroit',  right: 'Jamais deux fois le même' },
    ],
  },
  {
    slug: 'ma_pensee',
    title: 'Ma façon de penser',
    intro: 'C’est ici que se joue l’essentiel.',
    questions: [
      { slug: 'discuter',  label: 'Dans une discussion',  left: 'Je cherche à comprendre', right: 'Je cherche à convaincre' },
      { slug: 'certitude', label: 'Mes avis',             left: 'Je doute souvent',        right: 'Je tranche vite' },
      { slug: 'desordre',  label: 'Le désordre',          left: 'Il m’angoisse',           right: 'Il me nourrit' },
      { slug: 'matiere',   label: 'Ce qui m’intéresse',   left: 'Les idées',               right: 'Les gens' },
    ],
  },
  {
    slug: 'ce_que_je_cherche',
    title: 'Ce que je cherche',
    intro: 'Chez l’autre, pas chez vous.',
    questions: [
      { slug: 'cherche_tempo',   label: 'Quelqu’un de',           left: 'Posé',                right: 'Électrique' },
      { slug: 'cherche_parole',  label: 'Une conversation',       left: 'Longue et lente',     right: 'Vive et dense' },
      { slug: 'cherche_accord',  label: 'Nos désaccords',         left: 'Qu’on se ressemble',  right: 'Qu’on se contredise' },
      { slug: 'cherche_horizon', label: 'Ce que j’attends',       left: 'Voir venir',          right: 'Savoir où on va' },
    ],
  },
]

export const ALL_TRAITS = TRAIT_SECTIONS.flatMap(s => s.questions.map(q => q.slug))
export const TOTAL_TRAITS = ALL_TRAITS.length

export const TRAIT_THEME = Object.fromEntries(
  TRAIT_SECTIONS.flatMap(s => s.questions.map(q => [q.slug, s.slug]))
)

// ─── Nettoyage ────────────────────────────────────────────────

// Ne garde que les clés connues et les valeurs entières dans l'échelle :
// un objet venu de la base ne dicte pas ce qu'on sait calculer.
export function sanitizeTraits(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const slug of ALL_TRAITS) {
    const v = Number(raw[slug])
    if (Number.isInteger(v) && v >= SCALE_MIN && v <= SCALE_MAX) out[slug] = v
  }
  return out
}

export function answeredCount(traits) {
  return Object.keys(sanitizeTraits(traits)).length
}

// ─── Le score ─────────────────────────────────────────────────

/**
 * Compare deux jeux de réponses.
 *
 * Sur chaque question répondue des deux côtés, l'accord vaut
 * 1 − écart/4 : identique = 1, opposé = 0. Les thèmes pèsent le même
 * poids, pour qu'un thème très rempli n'écrase pas les autres.
 *
 * @returns {{ score: number|null, common: number, byTheme: Object }}
 *          score sur 100, ou null si trop peu de réponses communes.
 */
export function computeCompatibility(a, b) {
  const mine   = sanitizeTraits(a)
  const theirs = sanitizeTraits(b)

  const sums   = {}   // thème → { total, n }
  let common = 0

  for (const slug of ALL_TRAITS) {
    if (!(slug in mine) || !(slug in theirs)) continue
    const accord = 1 - Math.abs(mine[slug] - theirs[slug]) / (SCALE_MAX - SCALE_MIN)
    const theme  = TRAIT_THEME[slug]
    sums[theme] = sums[theme] || { total: 0, n: 0 }
    sums[theme].total += accord
    sums[theme].n     += 1
    common += 1
  }

  const byTheme = {}
  for (const [theme, { total, n }] of Object.entries(sums)) {
    byTheme[theme] = Math.round((total / n) * 100)
  }

  if (common < MIN_COMMON_ANSWERS) {
    return { score: null, common, byTheme }
  }

  const themes = Object.values(byTheme)
  const score  = Math.round(themes.reduce((s, v) => s + v, 0) / themes.length)
  return { score, common, byTheme }
}

// ─── Affichage ────────────────────────────────────────────────

export function compatibilityLabel(score) {
  if (score == null)  return 'À compléter'
  if (score >= 85)    return 'Vous vous comprendrez vite'
  if (score >= 70)    return 'Beaucoup de terrain commun'
  if (score >= 55)    return 'De quoi discuter longtemps'
  if (score >= 40)    return 'Vous ne serez pas d’accord'
  return 'Deux mondes'
}
