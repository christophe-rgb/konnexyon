import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const [form,    setForm]    = useState({ email: '', email2: '', password: '', confirm: '' })
  const [adult,   setAdult]   = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!adult)                         return setError('Vous devez confirmer avoir 18 ans ou plus.')
    if (form.password !== form.confirm) return setError('Les mots de passe ne correspondent pas.')
    if (form.password.length < 8)       return setError('Mot de passe minimum 8 caractères.')
    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (err) { setError(err.message); setLoading(false); return }
    await supabase.from('profiles').insert({
      id:      data.user.id,
      email_1: form.email,
      email_2: form.email2 || null,
      couple_name: 'Nouveau couple',
      email_1_confirmed: false,
    })
    navigate('/onboarding')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">

      {/* fond logo filigrane */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <img
          src="/logo.png" alt="" aria-hidden="true"
          style={{ width: '120vw', maxWidth: '780px', opacity: 0.35, filter: 'brightness(0.8)', userSelect: 'none' }}
        />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, rgba(5,5,5,0.5) 0%, rgba(5,5,5,0.85) 60%, rgba(5,5,5,0.98) 100%)',
        }} />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* header */}
        <div className="flex flex-col items-center mb-8 animate-fade-in-up" style={{ animationFillMode: 'both' }}>
          <Link to="/login" style={{ color: 'rgba(201,168,76,0.4)', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', marginBottom: '24px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'rgba(201,168,76,0.4)'}>
            ← Retour
          </Link>
          <span style={{
            fontFamily: 'Cormorant, serif',
            fontSize: '2.2rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Créer ma connexion
          </span>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '6px', letterSpacing: '0.05em' }}>
            Connectez-vous à ceux qui vous correspondent
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <Field
            label="Email partenaire 1" id="email" type="email" autoComplete="email"
            value={form.email} onChange={v => set('email', v)} placeholder="vous@email.com"
            delay="100ms"
          />
          <Field
            label="Email partenaire 2 (optionnel)" id="email2" type="email"
            value={form.email2} onChange={v => set('email2', v)} placeholder="partenaire@email.com"
            delay="150ms"
          />
          <Field
            label="Mot de passe" id="password" type="password" autoComplete="new-password"
            value={form.password} onChange={v => set('password', v)} placeholder="Minimum 8 caractères"
            delay="200ms"
          />
          <Field
            label="Confirmer le mot de passe" id="confirm" type="password" autoComplete="new-password"
            value={form.confirm} onChange={v => set('confirm', v)} placeholder="••••••••"
            delay="250ms"
          />

          {/* checkbox 18+ */}
          <label
            className="flex items-start gap-3 cursor-pointer mt-1 animate-fade-in-up"
            style={{ animationDelay: '300ms', animationFillMode: 'both' }}
          >
            <input
              type="checkbox" id="adult" checked={adult} onChange={e => setAdult(e.target.checked)}
              className="mt-0.5 w-5 h-5 flex-shrink-0"
              style={{ accentColor: '#C9A84C' }}
            />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              J'ai <strong style={{ color: 'rgba(201,168,76,0.7)' }}>18 ans ou plus</strong> et je certifie être majeur(e).
              Ce site s'adresse exclusivement aux adultes consentants.
            </span>
          </label>

          {error && (
            <p role="alert" className="animate-fade-in" style={{
              color: '#f87171', fontSize: '13px',
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.18)',
              borderRadius: '10px', padding: '10px 14px',
              animationFillMode: 'both',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit" disabled={loading}
            className="btn-gold mt-2 animate-fade-in-up"
            style={{
              width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
              cursor: loading ? 'default' : 'pointer',
              fontSize: '13px', letterSpacing: '0.16em',
              opacity: loading ? 0.75 : 1,
              animationDelay: '350ms', animationFillMode: 'both',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#050505', borderRadius: '50%', animation: 'rotateX 0.7s linear infinite' }} />
                Création de la connexion…
              </span>
            ) : 'Me connecter'}
          </button>
        </form>

        <p className="animate-fade-in" style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '24px', animationDelay: '400ms', animationFillMode: 'both' }}>
          Déjà connecté ?{' '}
          <Link to="/login" style={{ color: 'rgba(201,168,76,0.6)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'rgba(201,168,76,0.6)'}>
            Se reconnecter
          </Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, id, type, value, onChange, placeholder, autoComplete, delay = '0ms' }) {
  return (
    <div className="animate-fade-in-up" style={{ animationDelay: delay, animationFillMode: 'both' }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', marginBottom: '7px' }}>
        {label}
      </label>
      <input
        id={id} type={type} autoComplete={autoComplete}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'rgba(15,15,15,0.85)',
          border: '1px solid rgba(201,168,76,0.18)',
          borderRadius: '14px',
          padding: '14px 18px',
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
  )
}
