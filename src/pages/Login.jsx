import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

/* Réseau de nœuds animés — évoque le X connexion du logo */
function ConnectionNetwork() {
  const nodes = [
    { cx: '8%',  cy: '12%', r: 2.5, delay: '0s'   },
    { cx: '92%', cy: '8%',  r: 2,   delay: '0.4s'  },
    { cx: '5%',  cy: '60%', r: 3,   delay: '0.8s'  },
    { cx: '95%', cy: '55%', r: 2,   delay: '0.2s'  },
    { cx: '50%', cy: '5%',  r: 1.5, delay: '1s'    },
    { cx: '88%', cy: '88%', r: 2,   delay: '0.6s'  },
    { cx: '12%', cy: '85%', r: 2.5, delay: '0.3s'  },
    { cx: '45%', cy: '95%', r: 1.5, delay: '0.9s'  },
  ]
  const lines = [
    { x1: '8%',  y1: '12%', x2: '92%', y2: '8%',  delay: '0.2s' },
    { x1: '8%',  y1: '12%', x2: '5%',  y2: '60%', delay: '0.5s' },
    { x1: '92%', y1: '8%',  x2: '95%', y2: '55%', delay: '0.7s' },
    { x1: '5%',  y1: '60%', x2: '12%', y2: '85%', delay: '0.9s' },
    { x1: '95%', y1: '55%', x2: '88%', y2: '88%', delay: '1.1s' },
    { x1: '50%', y1: '5%',  x2: '92%', y2: '8%',  delay: '0.3s' },
    { x1: '12%', y1: '85%', x2: '45%', y2: '95%', delay: '1.3s' },
    { x1: '88%', y1: '88%', x2: '45%', y2: '95%', delay: '1.5s' },
    { x1: '8%',  y1: '12%', x2: '50%', y2: '5%',  delay: '0.6s' },
  ]
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {lines.map((l, i) => (
        <line key={i}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="#C9A84C" strokeWidth="0.6"
          strokeDasharray="300"
          style={{
            strokeDashoffset: 0,
            opacity: 0,
            animation: `connectionDraw 2.5s ease-out ${l.delay} forwards`,
          }}
        />
      ))}
      {nodes.map((n, i) => (
        <circle key={i}
          cx={n.cx} cy={n.cy} r={n.r}
          fill="#C9A84C"
          filter="url(#glow)"
          style={{
            opacity: 0,
            animation: `fadeIn 0.6s ease ${n.delay} forwards, nodePulse 3s ease-in-out ${n.delay} infinite`,
          }}
        />
      ))}
    </svg>
  )
}

export default function Login() {
  const [email,    setEmail]    = useState('')
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

      {/* ── fond : logo en filigrane ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          style={{
            width: '130vw',
            maxWidth: '860px',
            opacity: 0.55,
            filter: 'brightness(0.85) saturate(0.9)',
            userSelect: 'none',
          }}
        />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, rgba(5,5,5,0.2) 0%, rgba(5,5,5,0.7) 55%, rgba(5,5,5,0.96) 100%)',
        }} />
      </div>

      {/* ── réseau de connexion animé ── */}
      <ConnectionNetwork />

      {/* ── contenu formulaire ── */}
      <div className="w-full max-w-sm relative z-10">

        {/* LOGO MARK */}
        <div className="flex flex-col items-center mb-10">
          {/* cercle ∞ flottant */}
          <div
            className="animate-fade-in delay-0 animate-float relative mb-6"
            style={{ animationFillMode: 'both' }}
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{
              background: 'radial-gradient(circle at 40% 35%, rgba(232,204,122,0.18), rgba(160,120,48,0.06))',
              border: '1px solid rgba(201,168,76,0.38)',
              boxShadow: '0 0 50px rgba(201,168,76,0.18), inset 0 1px 0 rgba(232,204,122,0.25)',
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #A07830, #E8CC7A, #C9A84C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '30px',
                fontFamily: 'Cormorant, serif',
                fontWeight: 600,
              }}>∞</span>
            </div>
            {/* halo pulsant */}
            <div className="absolute inset-0 rounded-full animate-pulse-gold" style={{
              border: '1px solid rgba(201,168,76,0.2)',
              transform: 'scale(1.3)',
            }} />
          </div>

          {/* Nom de marque shimmer */}
          <h1
            className="animate-fade-in-up delay-100 text-gold-shimmer"
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
            <div className="w-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4))' }} />
            <span style={{
              fontSize: '9px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.55)',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
            }}>Libertins par choix · Connectés par désir</span>
            <div className="w-8 h-px" style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)' }} />
          </div>
        </div>

        {/* FORMULAIRE */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* email */}
          <div className="animate-fade-in-up delay-300 flex flex-col gap-2" style={{ animationFillMode: 'both' }}>
            <label htmlFor="email" style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.55)' }}>
              Email
            </label>
            <input
              id="email" type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="input-gold"
              style={{
                background: 'rgba(15,15,15,0.85)',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '14px',
                padding: '15px 18px',
                color: '#F2EDE6',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                backdropFilter: 'blur(12px)',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.07)'; }}
              onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.18)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* mot de passe */}
          <div className="animate-fade-in-up delay-400 flex flex-col gap-2" style={{ animationFillMode: 'both' }}>
            <div className="flex items-center justify-between">
              <label htmlFor="password" style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.55)' }}>
                Mot de passe
              </label>
              <Link to="/forgot-password" style={{ fontSize: '11px', color: 'rgba(201,168,76,0.5)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#C9A84C'}
                onMouseLeave={e => e.target.style.color = 'rgba(201,168,76,0.5)'}>
                Oublié ?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password" type={showPwd ? 'text' : 'password'} required autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'rgba(15,15,15,0.85)',
                  border: '1px solid rgba(201,168,76,0.18)',
                  borderRadius: '14px',
                  padding: '15px 48px 15px 18px',
                  color: '#F2EDE6',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  backdropFilter: 'blur(12px)',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.07)'; }}
                onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.18)'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Masquer' : 'Afficher'}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(201,168,76,0.4)', fontSize: '12px', letterSpacing: '0.05em',
                  padding: '4px', transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(201,168,76,0.4)'}
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
          <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.3)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>ou</span>
        </div>

        {/* bouton démo */}
        <button
          onClick={handleDemo}
          className="animate-fade-in-up delay-700"
          style={{
            width: '100%', padding: '15px', borderRadius: '14px', cursor: 'pointer',
            background: 'rgba(201,168,76,0.04)',
            border: '1px solid rgba(201,168,76,0.2)',
            color: 'rgba(201,168,76,0.7)',
            fontSize: '12px', letterSpacing: '0.12em',
            transition: 'all 0.25s',
            textTransform: 'uppercase',
            animationFillMode: 'both',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)'; e.currentTarget.style.color = '#C9A84C'; e.currentTarget.style.background = 'rgba(201,168,76,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'; e.currentTarget.style.color = 'rgba(201,168,76,0.7)'; e.currentTarget.style.background = 'rgba(201,168,76,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          ∞ &nbsp; Explorer les connexions
        </button>

        <p className="animate-fade-in delay-800" style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '28px', animationFillMode: 'both' }}>
          Pas encore connecté ?{' '}
          <Link to="/register" style={{ color: 'rgba(201,168,76,0.6)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'rgba(201,168,76,0.6)'}
          >
            Créer ma connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
