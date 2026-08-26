import { safeGet, safeSet, safeRemove } from './storage'

/**
 * Les swipes faits avant l'inscription.
 *
 * Un visiteur qui retient une ligne ne doit pas perdre son geste parce
 * qu'il n'a pas encore de compte : on le garde de son cote, et il
 * devient une vraie connexion une fois le compte cree.
 *
 * Stocke dans le navigateur, donc jamais sur nos serveurs tant que la
 * personne n'a rien decide.
 */
const CLE = 'konnexyon_swipes_en_attente'
const MAX = 12   // au-dela, ce n'est plus un apercu

export function lireSwipes() {
  try {
    const brut = JSON.parse(safeGet(CLE) || '[]')
    if (!Array.isArray(brut)) return []
    // on ne garde que des identifiants plausibles : ce qui vient du
    // navigateur n'est jamais digne de confiance
    return brut
      .filter(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))
      .slice(0, MAX)
  } catch {
    return []
  }
}

export function ajouterSwipe(auteur) {
  if (!auteur) return
  const deja = lireSwipes()
  if (deja.includes(auteur)) return
  safeSet(CLE, JSON.stringify([...deja, auteur].slice(0, MAX)))
}

export function oublierSwipes() {
  safeRemove(CLE)
}
