import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (err) { setError(err.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center gap-2 text-muted hover:text-text text-sm mb-8 transition-colors duration-150">
          <ArrowLeft size={16} strokeWidth={1.5} />
          Retour
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gold/10 border border-[rgba(201,168,76,0.3)] flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✉️</span>
            </div>
            <h1 className="font-serif text-3xl font-semibold mb-2">Email envoyé</h1>
            <p className="text-muted text-sm leading-relaxed">
              Si cet email est associé à un compte, vous recevrez un lien de réinitialisation dans quelques minutes.
            </p>
            <Link to="/login" className="inline-block mt-6 text-gold text-sm hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-4xl font-semibold mb-1">Mot de passe oublié</h1>
            <p className="text-muted text-sm mb-8">Entrez votre email pour recevoir un lien de réinitialisation.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-muted mb-1.5" htmlFor="email">Email</label>
                <input
                  id="email" type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full bg-surface2 border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors duration-150"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gold text-bg font-semibold hover:bg-[#d4ae58] disabled:opacity-50 transition-colors duration-150 cursor-pointer"
              >
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
