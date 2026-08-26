/**
 * Le tirage du jour.
 *
 * Tous les joueurs doivent recevoir la meme grille, le meme mot, les
 * memes lettres — sans qu'un serveur ait a les distribuer. On derive
 * donc tout d'une graine calculee a partir de la date : le meme jour
 * donne le meme tirage partout, et personne ne peut jouer demain.
 */

// La journee bascule a minuit heure francaise, comme le mot du jour et
// le quota de connexions.
const FUSEAU = 'Europe/Paris'

const FORMAT_JOUR = new Intl.DateTimeFormat('fr-CA', {
  timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit',
})

/** La date du jour au format YYYY-MM-DD, heure de Paris. */
export function jourCourant(maintenant = new Date()) {
  return FORMAT_JOUR.format(maintenant)   // fr-CA rend deja YYYY-MM-DD
}

/**
 * Graine entiere derivee d'une chaine — FNV-1a, 32 bits.
 *
 * Choisi pour sa dispersion : deux dates voisines doivent donner des
 * tirages sans rapport, sinon les grilles de lundi et mardi se
 * ressemblent.
 */
export function graine(texte) {
  let h = 0x811c9dc5
  const s = String(texte)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Generateur pseudo-aleatoire deterministe (mulberry32).
 * Renvoie une fonction qui donne des flottants dans [0, 1[.
 */
export function tirage(depart) {
  let a = depart >>> 0
  return function suivant() {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Le tirage d'un jeu, pour un jour donne. */
export function tirageDuJour(jeu, jour = jourCourant()) {
  return tirage(graine(`${jeu}:${jour}`))
}

/** Un element au hasard, de facon reproductible. */
export function choisir(liste, suivant) {
  if (!liste?.length) return null
  return liste[Math.floor(suivant() * liste.length)]
}

/** Melange de Fisher-Yates, sans toucher au tableau d'origine. */
export function melanger(liste, suivant) {
  const copie = [...(liste || [])]
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(suivant() * (i + 1))
    ;[copie[i], copie[j]] = [copie[j], copie[i]]
  }
  return copie
}
