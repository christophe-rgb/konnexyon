import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, X } from 'lucide-react'
import { Wordmark } from '../components/Logo'
import Plate from '../components/boutique/Plates'
import { euros, FRANCO_CENTS } from '../lib/boutique'
import { usePanier, usePanierTotaux } from '../store/panier'
import { passerCommande } from '../lib/checkout'
import { useAuthStore } from '../store/auth'
import { toast } from '../components/Toast'

/** Le panier et le passage en caisse. */
export default function Panier() {
  const { items, sous_total_cents, livraison_cents, total_cents, manque_franco_cents, count } = usePanierTotaux()
  const changerQuantite = usePanier(s => s.changerQuantite)
  const retirer         = usePanier(s => s.retirer)
  const profile         = useAuthStore(s => s.profile)
  const [enCours, setEnCours] = useState(false)

  const progression = Math.min(100, Math.round((sous_total_cents / FRANCO_CENTS) * 100))

  const commander = async () => {
    setEnCours(true)
    try {
      const { url, erreur } = await passerCommande(items, profile)
      if (url) { window.location.href = url; return }
      toast(erreur || 'Le paiement n’est pas encore ouvert — réessayez bientôt.', 'error')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ivoire)', color: 'var(--encre)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px clamp(20px, 5vw, 56px)', maxWidth: 900, margin: '0 auto',
      }}>
        <Link to="/" aria-label="Konnexyon, accueil"><Wordmark size={22} tone="encre" /></Link>
        <Link to="/boutique" className="flex items-center gap-2" style={{
          color: 'rgba(11,11,11,0.5)', fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', textDecoration: 'none',
        }}>
          <ArrowLeft size={14} strokeWidth={1.5} /> Continuer
        </Link>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '20px clamp(20px, 5vw, 56px) 80px' }}>
        <h1 style={{
          fontFamily: 'Cormorant, serif', fontSize: 'clamp(2.2rem, 8vw, 3rem)',
          fontWeight: 500, lineHeight: 1.05,
        }}>
          Votre panier
        </h1>

        {count === 0 ? (
          <div style={{ padding: '70px 0', textAlign: 'center' }}>
            <p style={{
              fontFamily: 'Cormorant, serif', fontStyle: 'italic',
              fontSize: '1.45rem', color: 'rgba(11,11,11,0.5)',
            }}>
              Il est vide, pour l’instant.
            </p>
            <Link to="/boutique" className="btn btn-continuer" style={{ marginTop: 28, display: 'inline-block' }}>
              Voir le rayon
            </Link>
          </div>
        ) : (
          <>
            {/* ── jauge franco de port ── */}
            {manque_franco_cents > 0 && (
              <div style={{ marginTop: 26 }}>
                <p style={{ fontSize: 12.5, color: 'rgba(11,11,11,0.6)' }}>
                  Plus que <strong style={{ color: 'var(--or)' }}>{euros(manque_franco_cents)}</strong> et
                  la livraison est offerte.
                </p>
                <div role="progressbar" aria-valuenow={progression} aria-valuemin={0} aria-valuemax={100}
                     style={{ height: 3, background: 'rgba(11,11,11,0.09)', marginTop: 10, borderRadius: 2 }}>
                  <div style={{
                    width: `${progression}%`, height: '100%', borderRadius: 2,
                    background: 'var(--gold-gradient)', transition: 'width 0.4s var(--ease-out)',
                  }} />
                </div>
              </div>
            )}

            {/* ── les lignes ── */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '34px 0 0' }}>
              {items.map(i => (
                <li key={i.slug} style={{
                  display: 'flex', gap: 18, alignItems: 'center',
                  padding: '20px 0', borderTop: '1px solid rgba(11,11,11,0.08)',
                }}>
                  <Link to={`/boutique/${i.slug}`} style={{ flexShrink: 0, width: 84 }}>
                    <Plate nom={i.plate} style={{ borderRadius: 2 }} />
                  </Link>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/boutique/${i.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.2rem' }}>{i.name}</p>
                    </Link>
                    <p style={{ fontSize: 12.5, color: 'rgba(11,11,11,0.5)', marginTop: 3 }}>
                      {euros(i.price_cents)} l’unité
                    </p>

                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 11,
                      border: '1px solid rgba(11,11,11,0.16)', borderRadius: 999, padding: '3px 5px',
                    }}>
                      <button onClick={() => changerQuantite(i.slug, i.quantity - 1)}
                              aria-label={`Retirer un ${i.name}`} style={pas}>
                        <Minus size={13} strokeWidth={1.6} />
                      </button>
                      <span aria-live="polite" style={{ minWidth: 20, textAlign: 'center', fontSize: 13 }}>
                        {i.quantity}
                      </span>
                      <button onClick={() => changerQuantite(i.slug, i.quantity + 1)}
                              aria-label={`Ajouter un ${i.name}`} style={pas}>
                        <Plus size={13} strokeWidth={1.6} />
                      </button>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: 'var(--or)', fontSize: 15 }}>{euros(i.ligne_cents)}</p>
                    <button onClick={() => retirer(i.slug)} aria-label={`Retirer ${i.name} du panier`}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', marginTop: 8,
                              padding: 4, color: 'rgba(11,11,11,0.35)',
                            }}>
                      <X size={14} strokeWidth={1.6} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* ── totaux ── */}
            <div style={{ borderTop: '1px solid rgba(11,11,11,0.08)', marginTop: 8, paddingTop: 26 }}>
              <Ligne libelle="Sous-total" valeur={euros(sous_total_cents)} />
              <Ligne libelle="Livraison"
                     valeur={livraison_cents === 0 ? 'Offerte' : euros(livraison_cents)} />
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginTop: 18, paddingTop: 18, borderTop: '1px solid rgba(11,11,11,0.08)',
              }}>
                <span style={{ fontFamily: 'Cormorant, serif', fontSize: '1.4rem' }}>Total</span>
                <span style={{ fontFamily: 'Cormorant, serif', fontSize: '1.9rem', color: 'var(--or)' }}>
                  {euros(total_cents)}
                </span>
              </div>

              <button onClick={commander} disabled={enCours} className="btn btn-continuer"
                      style={{ width: '100%', marginTop: 26 }}>
                {enCours ? 'Un instant…' : 'Passer commande'}
              </button>

              <p style={{ fontSize: 11.5, lineHeight: 1.8, color: 'rgba(11,11,11,0.45)', marginTop: 16, textAlign: 'center' }}>
                Paiement sécurisé · TVA incluse · Trente jours pour changer d’avis
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Ligne({ libelle, valeur }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '6px 0' }}>
      <span style={{ color: 'rgba(11,11,11,0.6)' }}>{libelle}</span>
      <span>{valeur}</span>
    </div>
  )
}

const pas = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 5,
  display: 'flex', alignItems: 'center', color: 'rgba(11,11,11,0.7)',
}
