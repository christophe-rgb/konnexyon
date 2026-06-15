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

    if (!adult)                          return setError('Vous devez confirmer avoir 18 ans ou plus.')
    if (form.password !== form.confirm)  return setError('Les mots de passe ne correspondent pas.')
    if (form.password.length < 8)        return setError('Mot de passe minimum 8 caractères.')

    setLoading(true)

    const { data, error: err } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    // créer le profil minimal
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
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-4xl font-semibold text-center mb-1">Inscription</h1>
        <p className="text-muted text-center text-sm mb-8">Créez votre compte couple.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Votre email (partenaire 1)" id="email" type="email" autoComplete="email"
            value={form.email} onChange={v => set('email', v)} placeholder="vous@email.com" />

          <Field label="Email du partenaire 2 (optionnel)" id="email2" type="email"
            value={form.email2} onChange={v => set('email2', v)} placeholder="partenaire@email.com" />

          <Field label="Mot de passe" id="password" type="password" autoComplete="new-password"
            value={form.password} onChange={v => set('password', v)} placeholder="Minimum 8 caractères" />

          <Field label="Confirmer le mot de passe" id="confirm" type="password" autoComplete="new-password"
            value={form.confirm} onChange={v => set('confirm', v)} placeholder="••••••••" />

          {/* checkbox 18+ */}
          <label className="flex items-start gap-3 cursor-pointer mt-1">
            <input
              type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-[#C9A84C] flex-shrink-0"
            />
            <span className="text-sm text-muted leading-snug">
              J'ai <strong className="text-text">18 ans ou plus</strong> et je certifie être majeur(e). Ce site s'adresse exclusivement aux adultes consentants.
            </span>
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="mt-2 w-full py-3 rounded-xl bg-gold text-bg font-semibold hover:bg-[#d4ae58] disabled:opacity-50 transition-colors duration-150 cursor-pointer"
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Déjà membre ?{' '}
          <Link to="/login" className="text-gold hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, id, type, value, onChange, placeholder, autoComplete }) {
  return (
    <div>
      <label className="block text-sm text-muted mb-1.5" htmlFor={id}>{label}</label>
      <input
        id={id} type={type} autoComplete={autoComplete}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface2 border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors duration-150"
      />
    </div>
  )
}
