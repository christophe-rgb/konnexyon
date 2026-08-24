import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Check } from 'lucide-react'
import { Quill, Wordmark } from '../components/Logo'
import Plate from '../components/boutique/Plates'
import { CATALOGUE, RAYONS, euros, FRANCO_CENTS } from '../lib/boutique'
import { usePanier, usePanierTotaux } from '../store/panier'

/**
 * La Papeterie — la boutique de Konnexyon.
 *
 * Même charte que le site : ivoire, encre, l'or pour l'action. La structure
 * de conversion est celle des boutiques de papeterie qui marchent (bandeau
 * franco permanent, un héros unique, best-sellers en tête, réassurance avant
 * le pied de page) ; l'habillage et les textes sont les nôtres.
 */

const REASSURANCE = [
  ['Expédié sous 48 h', 'Depuis l’Hérault, emballé à la main.'],
  ['Trente jours pour changer d’avis', 'Retour accepté, même ouvert.'],
  ['Livraison offerte dès ' + euros(FRANCO_CENTS), 'En France métropolitaine.'],
]

export default function Boutique() {
  const [rayon, setRayon] = useState('tout')
  const ajouter = usePanier(s => s.ajouter)
  const { count } = usePanierTotaux()
  const [ajoute, setAjoute] = useState(null)

  const heros = CATALOGUE[0]
  const rayonnage = useMemo(
    () => CATALOGUE.filter(p => rayon === 'tout' || p.category === rayon).sort((a, b) => a.rank - b.rank),
    [rayon],
  )

  const mettreAuPanier = slug => {
    ajouter(slug, 1)
    setAjoute(slug)
    setTimeout(() => setAjoute(a => (a === slug ? null : a)), 1600)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ivoire)', color: 'var(--encre)', overflowX: 'hidden' }}>

      {/* ── bandeau franco — visible sur toute la page ── */}
      <div style={{
        background: 'var(--encre)', color: 'var(--ivoire)', textAlign: 'center',
        padding: '9px 16px', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>
        Livraison offerte dès {euros(FRANCO_CENTS)} · Expédié sous 48 h
      </div>

      {/* ── barre ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px clamp(20px, 5vw, 56px)', maxWidth: 1180, margin: '0 auto',
      }}>
        <Link to="/" aria-label="Konnexyon, accueil"><Wordmark size={22} tone="encre" /></Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px, 3vw, 34px)' }}>
          <a href="#rayons" style={navLink} className="hidden sm:inline">Le rayon</a>
          <a href="#ensemble" style={navLink} className="hidden sm:inline">Pourquoi</a>
          <Link to="/panier" style={{ ...navLink, color: 'var(--or)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <ShoppingBag size={15} strokeWidth={1.6} />
            Panier{count > 0 && <span aria-label={`${count} article(s)`}>({count})</span>}
          </Link>
        </nav>
      </header>

      {/* ── accroche ── */}
      <section style={{
        maxWidth: 1180, margin: '0 auto',
        padding: 'clamp(24px, 5vw, 56px) clamp(20px, 5vw, 56px) clamp(40px, 7vw, 72px)',
      }}>
        <p style={sectionLabel}>La Papeterie</p>
        <h1 className="animate-fade-in-up" style={{
          fontFamily: 'Cormorant, serif', fontSize: 'clamp(2.1rem, 6.2vw, 3.7rem)',
          fontWeight: 500, lineHeight: 1.14, marginTop: 20, maxWidth: 760,
          animationFillMode: 'both',
        }}>
          Ce que vous écrivez ici<br />mérite d’exister sur du papier.
        </h1>
        <p style={{
          fontFamily: 'Cormorant, serif', fontStyle: 'italic', color: 'var(--or)',
          fontSize: 'clamp(1.15rem, 3.2vw, 1.6rem)', marginTop: 16,
        }}>
          De l’écran à l’encre.
        </p>
      </section>

      {/* ── le héros ── */}
      <section style={{ background: 'var(--encre)', color: 'var(--ivoire)' }}>
        <div style={{
          maxWidth: 1180, margin: '0 auto',
          padding: 'clamp(44px, 7vw, 76px) clamp(20px, 5vw, 56px)',
          display: 'grid', gap: 'clamp(28px, 5vw, 64px)', alignItems: 'center',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}>
          <Link to={`/boutique/${heros.slug}`} aria-label={heros.name}>
            <Plate nom={heros.plate} style={{ borderRadius: 2 }} />
          </Link>

          <div>
            <p style={{ ...sectionLabel, color: 'var(--or)' }}>Le plus offert</p>
            <h2 style={{
              fontFamily: 'Cormorant, serif', fontSize: 'clamp(1.9rem, 5vw, 2.9rem)',
              fontWeight: 500, margin: '16px 0 12px', lineHeight: 1.15,
            }}>
              {heros.name}
            </h2>
            <p style={{
              fontFamily: 'Cormorant, serif', fontStyle: 'italic',
              fontSize: '1.3rem', color: 'rgba(242,238,230,0.72)',
            }}>
              {heros.tagline}
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '26px 0 0' }}>
              {heros.detail.map(d => (
                <li key={d} style={{
                  display: 'flex', gap: 11, alignItems: 'baseline',
                  fontSize: 13.5, lineHeight: 1.9, color: 'rgba(242,238,230,0.66)',
                }}>
                  <span style={{ color: 'var(--or)', fontSize: 11 }}>—</span>{d}
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 28 }}>
              <span style={{ fontFamily: 'Cormorant, serif', fontSize: '2.1rem', color: 'var(--or)' }}>
                {euros(heros.price_cents)}
              </span>
              {heros.compare_cents && (
                <span style={{ fontSize: 14, color: 'rgba(242,238,230,0.4)', textDecoration: 'line-through' }}>
                  {euros(heros.compare_cents)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
              <button onClick={() => mettreAuPanier(heros.slug)} className="btn btn-continuer">
                {ajoute === heros.slug ? 'Ajouté ✓' : 'Mettre au panier'}
              </button>
              <Link to={`/boutique/${heros.slug}`} className="btn btn-ecrire">Voir le détail</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── le rayon ── */}
      <section id="rayons" style={{
        maxWidth: 1180, margin: '0 auto',
        padding: 'clamp(48px, 8vw, 84px) clamp(20px, 5vw, 56px)',
      }}>
        <p style={{ ...sectionLabel, color: 'rgba(11,11,11,0.45)' }}>Le rayon</p>

        <div role="tablist" aria-label="Rayons" style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', margin: '26px 0 40px',
        }}>
          {RAYONS.map(r => {
            const actif = r.key === rayon
            return (
              <button key={r.key} role="tab" aria-selected={actif}
                onClick={() => setRayon(r.key)}
                style={{
                  padding: '8px 17px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 11, letterSpacing: '0.13em', textTransform: 'uppercase',
                  transition: 'all 0.25s var(--ease-out)',
                  border: `1px solid ${actif ? 'transparent' : 'rgba(11,11,11,0.15)'}`,
                  background: actif ? 'var(--encre)' : 'transparent',
                  color: actif ? 'var(--ivoire)' : 'rgba(11,11,11,0.62)',
                }}>
                {r.label}
              </button>
            )
          })}
        </div>

        <div style={{
          display: 'grid', gap: 'clamp(20px, 3vw, 38px)',
          gridTemplateColumns: 'repeat(auto-fill, minmax(228px, 1fr))',
        }}>
          {rayonnage.map((p, i) => (
            <article key={p.slug} className="animate-fade-in-up"
                     style={{ animationFillMode: 'both', animationDelay: `${Math.min(i, 6) * 60}ms` }}>
              <Link to={`/boutique/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Plate nom={p.plate} style={{ borderRadius: 2 }} />
                <h3 style={{
                  fontFamily: 'Cormorant, serif', fontSize: '1.35rem', fontWeight: 500,
                  margin: '15px 0 5px', lineHeight: 1.25,
                }}>
                  {p.name}
                </h3>
                <p style={{ fontSize: 12.5, lineHeight: 1.65, color: 'rgba(11,11,11,0.55)', minHeight: 34 }}>
                  {p.tagline}
                </p>
                <p style={{ marginTop: 9, display: 'flex', alignItems: 'baseline', gap: 9 }}>
                  <span style={{ color: 'var(--or)', fontSize: 15, fontWeight: 500 }}>
                    {euros(p.price_cents)}
                    {p.category === 'abonnement' && <span style={{ fontSize: 11 }}> / mois</span>}
                  </span>
                  {p.compare_cents && (
                    <span style={{ fontSize: 12, color: 'rgba(11,11,11,0.35)', textDecoration: 'line-through' }}>
                      {euros(p.compare_cents)}
                    </span>
                  )}
                </p>
              </Link>

              <button onClick={() => mettreAuPanier(p.slug)}
                aria-label={`Mettre ${p.name} au panier`}
                style={{
                  marginTop: 13, width: '100%', padding: '11px 0', cursor: 'pointer',
                  fontSize: 11, letterSpacing: '0.13em', textTransform: 'uppercase',
                  border: '1px solid rgba(11,11,11,0.18)', borderRadius: 999,
                  transition: 'all 0.25s var(--ease-out)',
                  background: ajoute === p.slug ? 'var(--or)' : 'transparent',
                  color: ajoute === p.slug ? 'var(--encre)' : 'rgba(11,11,11,0.75)',
                }}>
                {ajoute === p.slug ? 'Ajouté ✓' : 'Ajouter'}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ── pourquoi la boutique existe ── */}
      <section id="ensemble" style={{ background: 'var(--encre)', color: 'var(--ivoire)' }}>
        <div style={{
          maxWidth: 900, margin: '0 auto', textAlign: 'center',
          padding: 'clamp(56px, 10vw, 108px) clamp(20px, 5vw, 56px)',
        }}>
          <Quill size={48} tone="or" style={{ marginBottom: 26 }} />
          <h2 style={{
            fontFamily: 'Cormorant, serif', fontSize: 'clamp(1.6rem, 5vw, 2.5rem)',
            fontWeight: 500, lineHeight: 1.3,
          }}>
            Konnexyon vous fait écrire à quelqu’un.<br />
            <span className="shine-text">La Papeterie vous donne de quoi.</span>
          </h2>
          <p style={{
            fontSize: 14.5, lineHeight: 1.95, color: 'rgba(242,238,230,0.6)',
            marginTop: 26, maxWidth: 560, marginInline: 'auto',
          }}>
            C’est le même geste, sur deux supports. Sur le site, vous écrivez une ligne
            par jour et vous lisez celles des autres. Sur le papier, vous les gardez —
            et un jour vous en envoyez une, cachetée, à la personne qui l’a lue en premier.
          </p>
          <div style={{ marginTop: 34, display: 'flex', gap: 13, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-continuer">Commencer à écrire</Link>
            <a href="#rayons" className="btn btn-ecrire">Voir le rayon</a>
          </div>
        </div>
      </section>

      {/* ── réassurance ── */}
      <section style={{
        maxWidth: 1180, margin: '0 auto',
        padding: 'clamp(44px, 7vw, 76px) clamp(20px, 5vw, 56px)',
        display: 'grid', gap: 'clamp(24px, 4vw, 48px)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}>
        {REASSURANCE.map(([titre, texte]) => (
          <div key={titre} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <Check size={16} strokeWidth={1.6} style={{ color: 'var(--or)', flexShrink: 0, marginTop: 3 }} />
            <div>
              <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.2rem' }}>{titre}</p>
              <p style={{ fontSize: 12.5, lineHeight: 1.7, color: 'rgba(11,11,11,0.52)', marginTop: 4 }}>{texte}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── pied ── */}
      <footer style={{
        maxWidth: 1180, margin: '0 auto',
        padding: '34px clamp(20px, 5vw, 56px) 52px',
        display: 'flex', flexWrap: 'wrap', gap: 18,
        alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid rgba(11,11,11,0.08)',
      }}>
        <Wordmark size={16} tone="encre" />
        <nav style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          <Link to="/" style={footLink}>Le site</Link>
          <Link to="/cgu" style={footLink}>Conditions</Link>
          <Link to="/confidentialite" style={footLink}>Confidentialité</Link>
          <Link to="/contact" style={footLink}>Contact</Link>
        </nav>
      </footer>
    </div>
  )
}

const navLink = {
  fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'rgba(11,11,11,0.65)', textDecoration: 'none',
}
const sectionLabel = {
  fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--or)',
}
const footLink = {
  fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'rgba(11,11,11,0.45)', textDecoration: 'none',
}
