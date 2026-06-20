import { useState, useEffect } from 'react'

const COOKIE_KEY = 'konnexyon_cookies'

export function useCookieConsent() {
  const [consent, setConsent] = useState(() => localStorage.getItem(COOKIE_KEY))
  const accept = () => { localStorage.setItem(COOKIE_KEY, 'accepted'); setConsent('accepted') }
  const refuse = () => { localStorage.setItem(COOKIE_KEY, 'refused');  setConsent('refused')  }
  return { consent, accept, refuse }
}

export default function CookieBanner() {
  const { consent, accept, refuse } = useCookieConsent()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!consent) {
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [consent])

  if (consent || !visible) return null

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      aria-live="polite"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 8000,
        background: 'linear-gradient(180deg, rgba(253,250,246,0.98) 0%, #F5F0E8 100%)',
        borderTop: '1px solid rgba(201,168,76,0.3)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        animation: 'slideUpCookie 0.4s cubic-bezier(0.34,1.2,0.64,1) both',
      }}
    >
      <style>{`
        @keyframes slideUpCookie {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div style={{
        maxWidth: 680, margin: '0 auto',
        padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* titre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🍪</span>
          <h2 style={{
            fontFamily: 'Cormorant, serif', fontSize: '1.15rem', fontWeight: 600,
            color: '#1C1814', letterSpacing: '0.05em', margin: 0,
          }}>
            Cookies & confidentialité
          </h2>
        </div>

        {/* texte */}
        <p style={{ fontSize: 13, color: 'rgba(80,70,60,0.85)', lineHeight: 1.7, margin: 0 }}>
          Konnexyon utilise des cookies essentiels pour son fonctionnement. Aucun cookie tiers, aucun tracker publicitaire.
          Consultez notre{' '}
          <a href="/confidentialite" style={{ color: 'rgba(201,168,76,1)', textDecoration: 'none' }}>
            politique de confidentialité
          </a>
          .
        </p>

        {/* boutons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={accept}
            style={{
              flex: '1 1 140px',
              padding: '12px 20px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)',
              border: 'none',
              color: '#050505',
              fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            Accepter
          </button>
          <button
            onClick={refuse}
            style={{
              flex: '1 1 140px',
              padding: '12px 20px',
              borderRadius: 12,
              background: 'transparent',
              border: '1px solid rgba(28,24,20,0.15)',
              color: 'rgba(80,70,60,0.8)',
              fontSize: 13, letterSpacing: '0.06em',
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = '#1C1814' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(28,24,20,0.15)'; e.currentTarget.style.color = 'rgba(80,70,60,0.8)' }}
          >
            Cookies essentiels uniquement
          </button>
        </div>
      </div>
    </div>
  )
}
