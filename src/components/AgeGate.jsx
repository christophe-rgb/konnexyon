import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { safeSet } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

export default function AgeGate({ onConfirm }) {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()

  const confirm = async () => {
    if (!checked) return
    setLoading(true)
    try {
      // Toujours persister en localStorage pour la session courante
      safeSet('age_confirmed', '1')

      // Si l'utilisateur est connecté, persister aussi en base Supabase
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ age_confirmed_at: new Date().toISOString() })
          .eq('id', user.id)
        if (error) console.error('[AgeGate] Supabase update error:', error)
      }

      onConfirm()
    } finally {
      setLoading(false)
    }
  }

  const refuse = () => {
    window.location.replace('https://www.google.com')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#FDFAF6',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
      textAlign: 'center',
    }}>

      {/* logo fond */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', pointerEvents: 'none' }}>
        <picture>
          <source srcSet="/logo.webp" type="image/webp" />
          <img src="/logo.png" alt="" aria-hidden style={{ width: '130vw', maxWidth: 800, opacity: 0.08, filter: 'brightness(1.4)' }} />
        </picture>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 420, width: '100%' }}>

        {/* badge 18+ */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 88, height: 88, borderRadius: '50%',
          border: '2px solid rgba(201,168,76,0.4)',
          background: 'rgba(201,168,76,0.1)',
          marginBottom: 28,
          fontFamily: 'Cormorant, serif',
          fontSize: '2rem', fontWeight: 700,
          background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          boxSizing: 'content-box',
        }}>
          <span style={{
            fontFamily: 'Cormorant, serif', fontSize: '2.2rem', fontWeight: 700,
            background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>18+</span>
        </div>

        <h1 style={{
          fontFamily: 'Cormorant, serif', fontSize: 'clamp(1.8rem, 6vw, 2.6rem)',
          fontWeight: 600, color: '#1C1814', lineHeight: 1.2, marginBottom: 14,
        }}>
          Site réservé aux adultes
        </h1>

        <p style={{ fontSize: 14, color: 'rgba(28,24,20,0.9)', lineHeight: 1.8, marginBottom: 32 }}>
          Konnexyon est une plateforme de rencontres pour couples adultes consentants.<br />
          L'accès est strictement réservé aux personnes majeures (18 ans ou plus).<br />
          En entrant, vous déclarez être majeur(e) et accepter les{' '}
          <a href="/cgu" style={{ color: 'rgba(201,168,76,1)', textDecoration: 'none' }}>CGU</a>.
        </p>

        {/* checkbox */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
          marginBottom: 28, textAlign: 'left',
          padding: '16px', borderRadius: 14,
          background: checked ? 'rgba(201,168,76,0.28)' : 'rgba(28,24,20,0.07)',
          border: `1px solid ${checked ? 'rgba(201,168,76,0.5)' : 'rgba(28,24,20,0.2)'}`,
          transition: 'all 0.25s',
        }}>
          <div
            onClick={() => setChecked(c => !c)}
            style={{
              flexShrink: 0, width: 22, height: 22, borderRadius: 6, marginTop: 1,
              border: `2px solid ${checked ? '#C9A84C' : 'rgba(28,24,20,0.3)'}`,
              background: checked ? 'rgba(201,168,76,0.28)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {checked && (
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4.5 8.5L11 1" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{ fontSize: 13, color: 'rgba(28,24,20,0.9)', lineHeight: 1.6 }}>
            Je certifie avoir <strong style={{ color: 'rgba(28,24,20,0.9)' }}>18 ans ou plus</strong> et accepte de consulter ce contenu pour adultes en toute légalité.
          </span>
        </label>

        {/* boutons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={confirm}
            disabled={!checked || loading}
            className={checked ? 'btn-gold erb-btn' : ''}
            style={{
              padding: '16px', borderRadius: 14, width: '100%',
              fontSize: 14, letterSpacing: '0.12em', cursor: checked ? 'pointer' : 'not-allowed',
              border: checked ? 'none' : '1px solid rgba(28,24,20,0.2)',
              background: checked ? undefined : 'rgba(28,24,20,0.07)',
              color: checked ? undefined : 'rgba(28,24,20,0.9)',
              transition: 'all 0.25s',
            }}
          >
            J'ai 18 ans ou plus — Entrer
          </button>
          <button
            onClick={refuse}
            style={{
              padding: '13px', borderRadius: 14, width: '100%', cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(28,24,20,0.08)',
              color: 'rgba(28,24,20,0.9)', fontSize: 13, letterSpacing: '0.06em',
            }}
          >
            J'ai moins de 18 ans — Quitter
          </button>
        </div>

        <p style={{ fontSize: 10, color: 'rgba(28,24,20,0.9)', marginTop: 24, letterSpacing: '0.08em' }}>
          © 2025 Konnexyon · Contenu pour adultes consentants · 18+
        </p>
      </div>
    </div>
  )
}
