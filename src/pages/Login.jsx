import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const navigate     = useNavigate()
  const fetchProfile = useAuthStore(s => s.fetchProfile)
  const setDemo      = useAuthStore(s => s.setDemo)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError('Email ou mot de passe incorrect.'); setLoading(false); return }
    await fetchProfile(data.user.id)
    navigator.geolocation?.getCurrentPosition(async pos => {
      await supabase.from('profiles').update({
        location: `POINT(${pos.coords.longitude} ${pos.coords.latitude})`,
        location_updated_at: new Date().toISOString(),
      }).eq('id', data.user.id)
    })
    navigate('/discover')
  }

  const handleDemo = () => { setDemo(); navigate('/discover') }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">

      {/* Logo en fond plein — page login */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          style={{
            width: '140vw',
            maxWidth: '900px',
            opacity: 0.6,
            filter: 'brightness(0.9)',
            userSelect: 'none',
          }}
        />
        {/* voile sombre pour lisibilité du formulaire */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(5,5,5,0.3) 0%, rgba(5,5,5,0.75) 65%, rgba(5,5,5,0.95) 100%)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* ── LOGO MARK ── */}
        <div className="flex flex-col items-center mb-10">
          {/* cercle doré */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle at 40% 35%, rgba(232,204,122,0.15), rgba(160,120,48,0.05))',
                border: '1px solid rgba(201,168,76,0.35)',
                boxShadow: '0 0 40px rgba(201,168,76,0.15), inset 0 1px 0 rgba(232,204,122,0.2)',
              }}>
              <span style={{
                background: 'linear-gradient(135deg, #A07830, #E8CC7A, #C9A84C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '28px',
                fontFamily: 'Cormorant, serif',
                fontWeight: 600,
              }}>∞</span>
            </div>
            {/* halo */}
            <div className="absolute inset-0 rounded-full animate-pulse_gold" />
          </div>

          {/* Nom de marque */}
          <h1 style={{
            fontFamily: 'Cormorant, serif',
            fontWeight: 600,
            fontSize: '3rem',
            letterSpacing: '0.15em',
            lineHeight: 1,
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #A07830 0%, #C9A84C 25%, #E8CC7A 50%, #C9A84C 75%, #A07830 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 5s ease infinite',
          }}>
            Konnexyon
          </h1>

          {/* séparateur + tagline */}
          <div className="flex items-center gap-3 mt-3">
            <div className="w-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4))' }} />
            <span style={{
              fontSize: '9px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.5)',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
            }}>Libertins par choix · Connectés par désir</span>
            <div className="w-8 h-px" style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)' }} />
          </div>
        </div>

        {/* ── FORMULAIRE ── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)' }}>
              Email
            </label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              style={{
                background: 'rgba(20,20,20,0.8)',
                border: '1px solid rgba(201,168,76,0.15)',
                borderRadius: '14px',
                padding: '14px 18px',
                color: '#F2EDE6',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
                backdropFilter: 'blur(10px)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.15)'}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)' }}>
                Mot de passe
              </label>
              <Link to="/forgot-password" style={{ fontSize: '11px', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = '#C9A84C'}
                onMouseLeave={e => e.target.style.color = 'rgba(201,168,76,0.5)'}>
                Oublié ?
              </Link>
            </div>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                background: 'rgba(20,20,20,0.8)',
                border: '1px solid rgba(201,168,76,0.15)',
                borderRadius: '14px',
                padding: '14px 18px',
                color: '#F2EDE6',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
                backdropFilter: 'blur(10px)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.15)'}
            />
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-gold mt-2"
            style={{ width: '100%', padding: '15px', borderRadius: '14px', border: 'none', cursor: loading ? 'default' : 'pointer', fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        {/* séparateur */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.12))' }} />
          <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.3)', letterSpacing: '0.1em' }}>ou</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.12), transparent)' }} />
        </div>

        {/* bouton démo */}
        <button onClick={handleDemo} style={{
          width: '100%', padding: '14px', borderRadius: '14px', cursor: 'pointer',
          background: 'transparent',
          border: '1px solid rgba(201,168,76,0.2)',
          color: 'rgba(201,168,76,0.7)',
          fontSize: '12px', letterSpacing: '0.1em',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = '#C9A84C'; e.currentTarget.style.background = 'rgba(201,168,76,0.04)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'; e.currentTarget.style.color = 'rgba(201,168,76,0.7)'; e.currentTarget.style.background = 'transparent' }}
        >
          ∞ &nbsp; Explorer les connexions
        </button>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '28px' }}>
          Pas encore connecté ?{' '}
          <Link to="/register" style={{ color: 'rgba(201,168,76,0.6)', textDecoration: 'none' }}>Créer ma connexion</Link>
        </p>
      </div>
    </div>
  )
}
