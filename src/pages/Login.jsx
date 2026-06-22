import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import XLogo from '../components/XLogo'


export default function Login() {
  const [email,    setEmail]    = useState(() => localStorage.getItem('last_email') || '')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)
  const navigate     = useNavigate()
  const fetchProfile = useAuthStore(s => s.fetchProfile)
  const setDemo      = useAuthStore(s => s.setDemo)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError('Email ou mot de passe incorrect.'); setLoading(false); return }
    localStorage.setItem('last_email', email)
    await fetchProfile(data.user.id)
    navigator.geolocation?.getCurrentPosition(async pos => {
      await supabase.from('profiles').update({
        location: `SRID=4326;POINT(${pos.coords.longitude} ${pos.coords.latitude})`,
        location_updated_at: new Date().toISOString(),
      }).eq('id', data.user.id)
    })
    navigate('/discover')
  }

  const handleDemo = () => { setDemo(); navigate('/discover') }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">

      {/* ── fond : logo en filigrane avec reflet bijou ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="shine-img" style={{ position: 'relative' }}>
          <picture>
            <source srcSet="/logo.webp" type="image/webp" />
            <img
              src="/logo.webp"
              alt=""
              aria-hidden="true"
              style={{
                width: '130vw',
                maxWidth: '860px',
                opacity: 0.12,
                filter: 'brightness(1.1) saturate(0.7)',
                userSelect: 'none',
                display: 'block',
              }}
            />
          </picture>
        </div>
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, rgba(253,250,246,0.2) 0%, rgba(253,250,246,0.7) 55%, rgba(253,250,246,0.96) 100%)',
        }} />
      </div>

      {/* ── contenu formulaire ── */}
      <div className="w-full max-w-sm relative z-10">

        {/* LOGO MARK */}
        <div className="flex flex-col items-center mb-10">
          {/* icône X connexion flottante */}
          <div
            className="animate-fade-in delay-0 animate-float relative mb-6"
            style={{ animationFillMode: 'both' }}
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{
              background: 'radial-gradient(circle at 40% 35%, rgba(232,204,122,0.18), rgba(160,120,48,0.06))',
              border: '1px solid rgba(201,168,76,0.35)',
              boxShadow: '0 0 24px rgba(201,168,76,0.2), inset 0 1px 0 rgba(232,204,122,0.25)',
            }}>
              <XLogo size={52} />
            </div>
            {/* halo pulsant */}
            <div className="absolute inset-0 rounded-full animate-pulse-gold" style={{
              border: '1px solid rgba(201,168,76,0.2)',
              transform: 'scale(1.3)',
            }} />
          </div>

          {/* Nom de marque shimmer */}
          <h1
            className="animate-fade-in-up delay-100 shine-text"
            style={{
              fontFamily: 'Cormorant, serif',
              fontWeight: 600,
              fontSize: '3rem',
              letterSpacing: '0.15em',
              lineHeight: 1,
              textTransform: 'uppercase',
              animationFillMode: 'both',
            }}
          >
            Konnexyon
          </h1>

          {/* tagline */}
          <div className="animate-fade-in delay-200 flex items-center gap-3 mt-3" style={{ animationFillMode: 'both' }}>
            <div className="w-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.1))' }} />
            <span className="shine-text" style={{
              fontSize: '9px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              animationDuration: '22s',
              animationDelay: '1s',
            }}>Libertins par choix · Connectés par désir</span>
            <div className="w-8 h-px" style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.1), transparent)' }} />
          </div>
        </div>

        {/* FORMULAIRE */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* email */}
          <div className="animate-fade-in-up delay-300 flex flex-col gap-2" style={{ animationFillMode: 'both' }}>
            <label htmlFor="email" style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)' }}>
              Email
            </label>
            <input
              id="email" type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="input-gold"
              style={{
                background: 'rgba(245,240,232,0.85)',
                border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: '14px',
                padding: '15px 18px',
                color: '#1C1814',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                backdropFilter: 'blur(12px)',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.7)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.12)'; }}
              onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.25)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* mot de passe */}
          <div className="animate-fade-in-up delay-400 flex flex-col gap-2" style={{ animationFillMode: 'both' }}>
            <div className="flex items-center justify-between">
              <label htmlFor="password" style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)' }}>
                Mot de passe
              </label>
              <Link to="/forgot-password" style={{ fontSize: '11px', color: 'rgba(201,168,76,1)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#C9A84C'}
                onMouseLeave={e => e.target.style.color = 'rgba(201,168,76,1)'}>
                Oublié ?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password" type={showPwd ? 'text' : 'password'} required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  background: 'rgba(245,240,232,0.85)',
                  border: '1px solid rgba(201,168,76,0.25)',
                  borderRadius: '14px',
                  padding: '15px 48px 15px 18px',
                  color: '#1C1814',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  backdropFilter: 'blur(12px)',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.7)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.12)'; }}
                onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.25)'; e.target.style.boxShadow = 'none'; }}
              />
              <button className="erb-btn"
                type="button"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Masquer' : 'Afficher'}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(201,168,76,1)', fontSize: '12px', letterSpacing: '0.05em',
                  padding: '4px', transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(201,168,76,1)'}
              >
                {showPwd ? '●●●' : '···'}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="animate-fade-in"
              style={{ color: '#f87171', fontSize: '13px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', padding: '10px 14px', animationFillMode: 'both' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit" disabled={loading}
            className="btn-gold animate-fade-in-up delay-500 mt-2"
            style={{
              width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
              cursor: loading ? 'default' : 'pointer',
              fontSize: '13px', letterSpacing: '0.16em',
              opacity: loading ? 0.75 : 1,
              animationFillMode: 'both',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#050505', borderRadius: '50%', animation: 'rotateX 0.7s linear infinite' }} />
                Connexion…
              </span>
            ) : 'Se connecter'}
          </button>
        </form>

        {/* séparateur */}
        <div className="animate-fade-in delay-600 separator-gold my-6" style={{ animationFillMode: 'both' }}>
          <span style={{ fontSize: '11px', color: 'rgba(201,168,76,1)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>ou</span>
        </div>

        {/* bouton démo */}
        <button
          onClick={handleDemo}
          className="animate-fade-in-up delay-700 erb-btn"
          style={{
            width: '100%', padding: '15px', borderRadius: '14px', cursor: 'pointer',
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.3)',
            color: 'rgba(201,168,76,0.85)',
            fontSize: '12px', letterSpacing: '0.12em',
            transition: 'all 0.25s',
            textTransform: 'uppercase',
            animationFillMode: 'both',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.55)'; e.currentTarget.style.color = '#C9A84C'; e.currentTarget.style.background = 'rgba(201,168,76,0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'; e.currentTarget.style.color = 'rgba(201,168,76,0.85)'; e.currentTarget.style.background = 'rgba(201,168,76,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          ∞ &nbsp; Explorer les connexions
        </button>

        <p className="animate-fade-in delay-800" style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(28,24,20,0.9)', marginTop: '28px', animationFillMode: 'both' }}>
          Pas encore connecté ?{' '}
          <Link to="/register" style={{ color: 'rgba(201,168,76,1)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'rgba(201,168,76,1)'}
          >
            Créer ma connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
