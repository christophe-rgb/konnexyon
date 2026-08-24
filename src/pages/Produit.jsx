import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, ShoppingBag, Minus, Plus } from 'lucide-react'
import { Wordmark } from '../components/Logo'
import Plate from '../components/boutique/Plates'
import { CATALOGUE, bySlug, euros, FRANCO_CENTS } from '../lib/boutique'
import { usePanier, usePanierTotaux } from '../store/panier'

/** La fiche produit. */
export default function Produit() {
  const { slug } = useParams()
  const produit = bySlug(slug)
  const ajouter = usePanier(s => s.ajouter)
  const { count } = usePanierTotaux()
  const [quantite, setQuantite] = useState(1)
  const [ajoute, setAjoute] = useState(false)

  if (!produit) return <Navigate to="/boutique" replace />

  // vente croisée : deux autres articles, jamais celui qu'on regarde
  const aussi = CATALOGUE.filter(p => p.slug !== produit.slug)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)

  const mettreAuPanier = () => {
    ajouter(produit.slug, quantite)
    setAjoute(true)
    setTimeout(() => setAjoute(false), 1800)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ivoire)', color: 'var(--encre)' }}>

      <div style={{
        background: 'var(--encre)', color: 'var(--ivoire)', textAlign: 'center',
        padding: '9px 16px', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>
        Livraison offerte dès {euros(FRANCO_CENTS)} · Expédié sous 48 h
      </div>

      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px clamp(20px, 5vw, 56px)', maxWidth: 1180, margin: '0 auto',
      }}>
        <Link to="/" aria-label="Konnexyon, accueil"><Wordmark size={22} tone="encre" /></Link>
        <Link to="/panier" style={{ ...navLink, color: 'var(--or)', display: 'flex', alignItems: 'center', gap: 7 }}>
          <ShoppingBag size={15} strokeWidth={1.6} />
          Panier{count > 0 && <span aria-label={`${count} article(s)`}>({count})</span>}
        </Link>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '8px clamp(20px, 5vw, 56px) 40px' }}>
        <Link to="/boutique" className="flex items-center gap-2" style={{
          color: 'rgba(11,11,11,0.45)', fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', textDecoration: 'none',
        }}>
          <ArrowLeft size={14} strokeWidth={1.5} /> Le rayon
        </Link>

        <div style={{
          display: 'grid', gap: 'clamp(28px, 5vw, 64px)', alignItems: 'start',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          marginTop: 30,
        }}>
          <Plate nom={produit.plate} style={{ borderRadius: 2 }} />

          <div>
            <h1 style={{
              fontFamily: 'Cormorant, serif', fontSize: 'clamp(1.9rem, 5.4vw, 2.9rem)',
              fontWeight: 500, lineHeight: 1.15,
            }}>
              {produit.name}
            </h1>
            <p style={{
              fontFamily: 'Cormorant, serif', fontStyle: 'italic',
              fontSize: '1.25rem', color: 'var(--or)', marginTop: 12,
            }}>
              {produit.tagline}
            </p>

            <div style={{ width: 60, height: 1, background: 'rgba(11,11,11,0.16)', margin: '26px 0' }} />

            <p style={{ fontSize: 14.5, lineHeight: 1.95, color: 'rgba(11,11,11,0.7)' }}>
              {produit.description}
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '26px 0 0' }}>
              {produit.detail.map(d => (
                <li key={d} style={{
                  display: 'flex', gap: 12, alignItems: 'baseline',
                  padding: '9px 0', borderTop: '1px solid rgba(11,11,11,0.07)',
                  fontSize: 13.5, color: 'rgba(11,11,11,0.62)',
                }}>
                  <span style={{ color: 'var(--or)', fontSize: 11 }}>—</span>{d}
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 30 }}>
              <span style={{ fontFamily: 'Cormorant, serif', fontSize: '2.2rem', color: 'var(--or)' }}>
                {euros(produit.price_cents)}
              </span>
              {produit.category === 'abonnement' && (
                <span style={{ fontSize: 13, color: 'rgba(11,11,11,0.5)' }}>par mois, sans engagement</span>
              )}
              {produit.compare_cents && (
                <span style={{ fontSize: 14, color: 'rgba(11,11,11,0.35)', textDecoration: 'line-through' }}>
                  {euros(produit.compare_cents)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap', alignItems: 'center', marginTop: 22 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                border: '1px solid rgba(11,11,11,0.18)', borderRadius: 999, padding: '4px 6px',
              }}>
                <button onClick={() => setQuantite(q => Math.max(1, q - 1))}
                        aria-label="Retirer un" style={pas}>
                  <Minus size={14} strokeWidth={1.6} />
                </button>
                <span aria-live="polite" style={{ minWidth: 22, textAlign: 'center', fontSize: 14 }}>{quantite}</span>
                <button onClick={() => setQuantite(q => Math.min(20, q + 1))}
                        aria-label="Ajouter un" style={pas}>
                  <Plus size={14} strokeWidth={1.6} />
                </button>
              </div>

              <button onClick={mettreAuPanier} className="btn btn-continuer">
                {ajoute ? 'Ajouté ✓' : 'Mettre au panier'}
              </button>
            </div>

            <p style={{ fontSize: 12, lineHeight: 1.8, color: 'rgba(11,11,11,0.45)', marginTop: 20 }}>
              Expédié sous 48 h depuis l’Hérault · Trente jours pour changer d’avis
            </p>
          </div>
        </div>

        {/* ── vente croisée ── */}
        <section style={{ marginTop: 'clamp(56px, 9vw, 96px)' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(11,11,11,0.45)' }}>
            Souvent pris ensemble
          </p>
          <div style={{
            display: 'grid', gap: 'clamp(20px, 3vw, 38px)', marginTop: 26,
            gridTemplateColumns: 'repeat(auto-fill, minmax(228px, 1fr))',
          }}>
            {aussi.map(p => (
              <Link key={p.slug} to={`/boutique/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Plate nom={p.plate} style={{ borderRadius: 2 }} />
                <h3 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.25rem', fontWeight: 500, margin: '13px 0 5px' }}>
                  {p.name}
                </h3>
                <p style={{ color: 'var(--or)', fontSize: 14 }}>{euros(p.price_cents)}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

const navLink = {
  fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'rgba(11,11,11,0.65)', textDecoration: 'none',
}
const pas = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 6,
  display: 'flex', alignItems: 'center', color: 'rgba(11,11,11,0.7)',
}
