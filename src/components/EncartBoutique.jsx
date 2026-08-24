import { Link } from 'react-router-dom'
import Plate from './boutique/Plates'
import { CATALOGUE, euros } from '../lib/boutique'

/**
 * L'encart Papeterie, posé sur le site.
 *
 * Deux tons selon l'endroit où il se pose :
 *   'encre'  — bande sombre pleine largeur, pour l'accueil public.
 *   'ivoire' — bloc discret dans la page, pour Mon carnet.
 *
 * Sur l'accueil il vend le Nécessaire (le produit d'appel des campagnes).
 * Dans le carnet il vend le Carnet papier, parce que c'est là que la
 * personne vient de finir d'écrire sa ligne — c'est le seul moment où
 * proposer un carnet n'est pas une interruption.
 */
export default function EncartBoutique({ ton = 'encre', slug = 'necessaire-a-lettres' }) {
  const p = CATALOGUE.find(x => x.slug === slug) || CATALOGUE[0]
  const sombre = ton === 'encre'

  const couleurTexte  = sombre ? 'var(--ivoire)' : 'var(--encre)'
  const couleurDouce  = sombre ? 'rgba(242,238,230,0.62)' : 'rgba(11,11,11,0.58)'

  return (
    <section style={{
      background: sombre ? 'var(--graphite)' : 'transparent',
      color: couleurTexte,
      border: sombre ? 'none' : '1px solid rgba(201,168,76,0.28)',
      borderRadius: sombre ? 0 : 3,
    }}>
      <div style={{
        maxWidth: sombre ? 1180 : 620, margin: '0 auto',
        padding: sombre ? 'clamp(44px, 7vw, 76px) clamp(20px, 5vw, 56px)' : '24px',
        display: 'grid', alignItems: 'center',
        gap: sombre ? 'clamp(26px, 4vw, 52px)' : 20,
        gridTemplateColumns: sombre ? 'repeat(auto-fit, minmax(260px, 1fr))' : '92px 1fr',
      }}>
        <Link to={`/boutique/${p.slug}`} aria-label={p.name}>
          <Plate nom={p.plate} style={{ borderRadius: 2 }} />
        </Link>

        <div>
          <p style={{
            fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'var(--or)',
          }}>
            La Papeterie
          </p>

          <h2 style={{
            fontFamily: 'Cormorant, serif', fontWeight: 500, lineHeight: 1.2,
            fontSize: sombre ? 'clamp(1.6rem, 4.4vw, 2.4rem)' : '1.35rem',
            margin: sombre ? '14px 0 12px' : '8px 0 6px',
          }}>
            {sombre
              ? <>Vous écrivez ici.<br />Le reste s’écrit à la main.</>
              : <>Vos lignes, sur du papier.</>}
          </h2>

          <p style={{
            fontSize: sombre ? 14 : 12.5, lineHeight: 1.85, color: couleurDouce,
            maxWidth: 460,
          }}>
            {sombre
              ? 'Le nécessaire complet — sceau, cire, plume, encre, papier. De quoi transformer une ligne lue sur un écran en lettre cachetée.'
              : 'Le Carnet du Mot du jour : une page par jour, le mot en haut, une ligne en dessous. Le même geste, en plus lent.'}
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            marginTop: sombre ? 24 : 14,
          }}>
            <Link to={`/boutique/${p.slug}`} className={sombre ? 'btn btn-continuer' : 'btn btn-lire'}>
              {sombre ? 'Découvrir' : 'Voir le carnet'}
            </Link>
            <span style={{ color: 'var(--or)', fontSize: sombre ? 15 : 13 }}>
              {euros(p.price_cents)}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
