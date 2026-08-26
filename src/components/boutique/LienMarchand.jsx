import { supabase } from '../../lib/supabase'
import { lienSortant, chezLeMarchand } from '../../lib/boutique'

/**
 * Le bouton qui mene chez le marchand.
 *
 * Trois exigences tiennent dans ce composant :
 *
 *  - `rel="sponsored"` : c'est l'attribut que Google attend sur un lien
 *    remunere. `nofollow` seul ne suffit plus, et l'omettre expose a une
 *    penalite de referencement.
 *  - `noopener noreferrer` : sans lui, la page ouverte garde une prise sur
 *    la notre via window.opener.
 *  - le depart est enregistre sans bloquer : la navigation part d'abord,
 *    la mesure suit. Un compteur en panne ne doit jamais retenir un
 *    visiteur qui allait acheter.
 */
export default function LienMarchand({ produit, className = 'btn btn-continuer', style = {}, children }) {
  const url = lienSortant(produit)

  // Pas encore de marchand : on le dit, plutot que d'offrir un bouton mort.
  if (!url) {
    return (
      <span
        aria-disabled="true"
        className="btn"
        style={{
          background: 'transparent',
          border: '1px solid rgba(11,11,11,0.15)',
          color: 'rgba(11,11,11,0.45)',
          cursor: 'default',
          ...style,
        }}
      >
        Bientôt disponible
      </span>
    )
  }

  const enregistrer = () => {
    // volontairement non attendu, et l'echec est ignore
    try { supabase.rpc('enregistrer_clic', { p_slug: produit.slug }) } catch { /* rien */ }
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      onClick={enregistrer}
      onAuxClick={enregistrer}
      className={className}
      style={{ textDecoration: 'none', ...style }}
    >
      {children || `Voir ${chezLeMarchand(produit) || 'chez le marchand'}`}
    </a>
  )
}
