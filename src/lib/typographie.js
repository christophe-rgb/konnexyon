/**
 * Ponctuation francaise : ; ? ! : et les guillemets veulent une espace
 * fine insecable, sinon le signe part seul en debut de ligne. Vu en
 * production sur la page d'accueil : "Le vide ne m'attire pas" / "; c'est
 * le bord qui me retient."
 *
 * On corrige a l'affichage, pas dans la base : les lignes appartiennent a
 * ceux qui les ecrivent, et la regle vaut aussi pour celles a venir.
 */

const FINE = ' '   // espace fine insecable

export function ponctuation(texte) {
  if (!texte) return texte
  return texte
    .replace(/\s+([;?!:])/g, FINE + '$1')
    .replace(/«\s+/g, '«' + FINE)
    .replace(/\s+»/g, FINE + '»')
}
