import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { isPremium } from '../lib/plan'

const PLANS = [
  {
    id: '1m',
    duration: '1 mois',
    price: 19.90,
    priceLabel: '19,90 €',
    total: '19,90 €',
    highlight: false,
  },
  {
    id: '3m',
    duration: '3 mois',
    price: 14.90,
    priceLabel: '14,90 €',
    total: '44,70 €',
    highlight: true,
    badge: 'Populaire',
  },
  {
    id: '6m',
    duration: '6 mois',
    price: 9.90,
    priceLabel: '9,90 €',
    total: '59,40 €',
    highlight: false,
    badge: 'Meilleure offre',
  },
]

const FEATURES_FREE = [
  { label: 'Voir les profils à proximité', ok: true },
  { label: 'Voir qui vous a liké', ok: true },
  { label: 'Envoyer des connexions (likes)', ok: false },
  { label: 'Messagerie & conversations', ok: false },
]

const FEATURES_PREMIUM = [
  { label: 'Voir les profils à proximité', ok: true },
  { label: 'Voir qui vous a liké', ok: true },
  { label: 'Envoyer des connexions (likes)', ok: true },
  { label: 'Messagerie & conversations', ok: true },
]

export default function Abonnement() {
  const profile  = useAuthStore(s => s.profile)
  const navigate = useNavigate()
  const premium  = isPremium(profile)
  const [selected, setSelected] = useState('3m')

  return (
    <div className="min-h-dvh flex flex-col pb-nav relative overflow-hidden">

      {/* header */}
      <header style={{
        background: 'rgba(5,5,5,0.96)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(201,168,76,0.1)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button className="erb-btn" onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(201,168,76,0.5)', fontSize: 20, padding: '4px 8px',
        }}>←</button>
        <div>
          <h1 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.3rem', fontWeight: 600,
            background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            letterSpacing: '0.08em',
          }}>
            Abonnement Premium
          </h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>
            Connexions illimitées
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">

        {/* statut actuel */}
        {premium && (
          <div style={{
            padding: '14px 18px', borderRadius: 16,
            background: 'rgba(201,168,76,0.07)',
            border: '1px solid rgba(201,168,76,0.3)',
          }}>
            <p style={{ fontSize: 13, color: '#C9A84C', fontWeight: 500 }}>
              ✓ Vous êtes Premium
            </p>
            {profile?.plan_expires_at && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                Expire le {new Date(profile.plan_expires_at).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        )}

        {/* comparaison Free vs Premium */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Free */}
          <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(15,15,15,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Free</p>
            {FEATURES_FREE.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: f.ok ? '#4ade80' : 'rgba(248,113,113,0.6)', flexShrink: 0, marginTop: 1 }}>
                  {f.ok ? '✓' : '✗'}
                </span>
                <span style={{ fontSize: 12, color: f.ok ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', lineHeight: 1.4 }}>{f.label}</span>
              </div>
            ))}
          </div>
          {/* Premium */}
          <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)' }}>
            <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 12 }}>Premium</p>
            {FEATURES_PREMIUM.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#C9A84C', flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* sélection durée */}
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', marginBottom: 12 }}>
            Choisissez votre durée
          </p>
          <div className="flex flex-col gap-3">
            {PLANS.map(plan => (
              <button
                key={plan.id}
                className="erb-btn"
                onClick={() => setSelected(plan.id)}
                style={{
                  position: 'relative',
                  textAlign: 'left', padding: '16px 18px', borderRadius: 16, cursor: 'pointer',
                  border: `1px solid ${selected === plan.id ? 'rgba(201,168,76,0.55)' : 'rgba(201,168,76,0.15)'}`,
                  background: selected === plan.id ? 'rgba(201,168,76,0.08)' : 'rgba(15,15,15,0.6)',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                {plan.badge && (
                  <span style={{
                    position: 'absolute', top: -10, right: 14,
                    background: 'linear-gradient(135deg, #A07830, #E8CC7A)',
                    color: '#050505', fontSize: 10, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 20, letterSpacing: '0.08em',
                  }}>{plan.badge}</span>
                )}
                <div>
                  <p style={{ fontSize: 15, fontWeight: 500, color: selected === plan.id ? '#C9A84C' : '#F2EDE6', marginBottom: 2 }}>
                    {plan.duration}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                    Total : {plan.total}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: selected === plan.id ? '#E8CC7A' : 'rgba(255,255,255,0.5)', fontFamily: 'Cormorant, serif' }}>
                    {plan.priceLabel}
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>/ mois</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          className="btn-gold"
          style={{ width: '100%', padding: '17px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 14, letterSpacing: '0.12em' }}
          onClick={() => alert('Paiement Stripe — à connecter')}
        >
          Activer Premium ∞
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.15)', lineHeight: 1.6 }}>
          Paiement sécurisé · Sans engagement · Résiliation à tout moment
        </p>
      </div>
    </div>
  )
}
