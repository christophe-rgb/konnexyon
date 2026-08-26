/**
 * Le mot cache — six essais pour trouver le mot du jour.
 *
 * Les accents ne comptent pas : « ecorce » vaut « ecorce » comme
 * « Ecorce ». On compare des lettres nues, l'affichage garde l'accent.
 */

export const ESSAIS_MAX = 6

/** Retire accents, casse et espaces : la forme sur laquelle on compare. */
export function normaliser(mot) {
  return String(mot ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

/**
 * Confronte une proposition au mot cherche.
 *
 * Chaque lettre recoit un verdict :
 *   'placee'  — bonne lettre, bonne place
 *   'presente'— la lettre est dans le mot, ailleurs
 *   'absente' — elle n'y est pas
 *
 * Le comptage se fait en deux passes. Sans cela, une lettre doublee
 * dans la proposition mais unique dans le mot serait signalee deux fois
 * comme presente, ce qui induit le joueur en erreur.
 */
export function confronter(proposition, mot) {
  const p = normaliser(proposition).split('')
  const m = normaliser(mot).split('')
  if (p.length !== m.length) return null

  const verdicts = new Array(p.length).fill('absente')
  const restantes = {}

  // 1re passe : les lettres bien placees, retirees du compte
  for (let i = 0; i < p.length; i++) {
    if (p[i] === m[i]) verdicts[i] = 'placee'
    else restantes[m[i]] = (restantes[m[i]] || 0) + 1
  }

  // 2e passe : les lettres presentes ailleurs, dans la limite du compte
  for (let i = 0; i < p.length; i++) {
    if (verdicts[i] === 'placee') continue
    if (restantes[p[i]] > 0) {
      verdicts[i] = 'presente'
      restantes[p[i]] -= 1
    }
  }

  return verdicts
}

/** La partie est-elle gagnee ? */
export function estGagnee(verdicts) {
  return Array.isArray(verdicts) && verdicts.length > 0 && verdicts.every(v => v === 'placee')
}

/**
 * L'etat d'une partie a partir de la suite des propositions.
 * @returns {{ verdicts: string[][], gagnee: boolean, terminee: boolean, essaisRestants: number }}
 */
export function partie(propositions, mot) {
  const verdicts = (propositions || [])
    .map(p => confronter(p, mot))
    .filter(Boolean)
  const gagnee = verdicts.some(estGagnee)
  const terminee = gagnee || verdicts.length >= ESSAIS_MAX
  return {
    verdicts,
    gagnee,
    terminee,
    essaisRestants: Math.max(0, ESSAIS_MAX - verdicts.length),
  }
}

/**
 * Le clavier : pour chaque lettre jouee, le meilleur verdict obtenu.
 * Une lettre trouvee bien placee ne doit pas redevenir « presente »
 * parce qu'un essai ulterieur l'a mal placee.
 */
const RANG = { absente: 0, presente: 1, placee: 2 }

export function clavier(propositions, mot) {
  const etat = {}
  for (const p of propositions || []) {
    const verdicts = confronter(p, mot)
    if (!verdicts) continue
    const lettres = normaliser(p).split('')
    lettres.forEach((lettre, i) => {
      const v = verdicts[i]
      if (!etat[lettre] || RANG[v] > RANG[etat[lettre]]) etat[lettre] = v
    })
  }
  return etat
}
