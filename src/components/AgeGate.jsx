import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { safeSet } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { toast } from './Toast'

export default function AgeGate({ onConfirm }) {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()

  const confirm = async () => {
    if (!checked) return
    setLoading(true)
    try {
      // Si l'utilisateur est connecté, persister en base AVANT d'entrer.
      // Sinon RequireProfile (qui lit age_confirmed_at) le renverrait en boucle
      // à l'onboarding. En cas d'échec, on ne valide pas.
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ age_confirmed_at: new Date().toISOString() })
          .eq('id', user.id)
        if (error) {
          console.error('[AgeGate] Supabase update error:', error)
          toast('Erreur, veuillez réessayer.', 'error')
          setLoading(false)
          return
        }
      }

      // Persiste en localStorage pour la session courante puis entre
      safeSet('age_confirmed', '1')
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
      background: '#0A0A0A',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
      textAlign: 'center',
      overflow: 'hidden',
    }}>

      {/* GRAND LOGO en fond, en mouvement, lueur dorée */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', pointerEvents: 'none' }}>
        {/* halo doré */}
        <div style={{ position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 72% 58% at 50% 46%, rgba(201,168,76,0.22), transparent 70%)' }} />
        <picture>
          <source srcSet="/logo.webp" type="image/webp" />
          <img src="/logo.webp" alt="" aria-hidden className="animate-float" style={{
            width: 'min(120vw, 760px)', maxHeight: '86vh', objectFit: 'contain', height: 'auto',
            opacity: 0.6,
            filter: 'drop-shadow(0 20px 80px rgba(201,168,76,0.7)) drop-shadow(0 0 40px rgba(201,168,76,0.3)) brightness(1.15) saturate(1.05)',
          }} />
        </picture>
        {/* léger voile pour garder le texte lisible */}
        <div style={{ position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.72) 60%, rgba(10,10,10,0.9) 100%)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 420, width: '100%' }}>

        {/* badge 18+ */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 88, height: 88, borderRadius: '50%',
          border: '2px solid rgba(201,168,76,0.45)',
          background: 'rgba(201,168,76,0.08)',
          marginBottom: 28,
          boxShadow: '0 0 28px rgba(201,168,76,0.25), inset 0 1px 0 rgba(232,204,122,0.25)',
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
          fontWeight: 600, color: '#F0EDE8', lineHeight: 1.2, marginBottom: 14,
        }}>
          Site réservé aux adultes
        </h1>

        <p style={{ fontSize: 14, color: 'rgba(240,237,232,0.75)', lineHeight: 1.8, marginBottom: 32 }}>
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
          background: checked ? 'rgba(201,168,76,0.16)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${checked ? 'rgba(201,168,76,0.55)' : 'rgba(201,168,76,0.18)'}`,
          transition: 'all 0.25s',
        }}>
          <div
            onClick={() => setChecked(c => !c)}
            style={{
              flexShrink: 0, width: 22, height: 22, borderRadius: 6, marginTop: 1,
              border: `2px solid ${checked ? '#C9A84C' : 'rgba(240,237,232,0.35)'}`,
              background: checked ? 'rgba(201,168,76,0.28)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {checked && (
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4.5 8.5L11 1" stroke="#E8CC7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{ fontSize: 13, color: 'rgba(240,237,232,0.8)', lineHeight: 1.6 }}>
            Je certifie avoir <strong style={{ color: '#F0EDE8' }}>18 ans ou plus</strong> et accepte de consulter ce contenu pour adultes en toute légalité.
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
              border: checked ? 'none' : '1px solid rgba(240,237,232,0.15)',
              background: checked ? undefined : 'rgba(255,255,255,0.05)',
              color: checked ? undefined : 'rgba(240,237,232,0.55)',
              transition: 'all 0.25s',
            }}
          >
            J'ai 18 ans ou plus — Entrer
          </button>
          <button
            onClick={refuse}
            style={{
              padding: '13px', borderRadius: 14, width: '100%', cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(240,237,232,0.12)',
              color: 'rgba(240,237,232,0.6)', fontSize: 13, letterSpacing: '0.06em',
            }}
          >
            J'ai moins de 18 ans — Quitter
          </button>
        </div>

        <p style={{ fontSize: 10, color: 'rgba(240,237,232,0.4)', marginTop: 24, letterSpacing: '0.08em' }}>
          © 2026 Konnexyon · Contenu pour adultes consentants · 18+
        </p>
      </div>
    </div>
  )
}
