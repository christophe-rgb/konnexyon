import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword]   = useState('')
  const [confirm,  setConfirm]    = useState('')
  const [loading,  setLoading]    = useState(false)
  const [error,    setError]      = useState('')
  const [ready,    setReady]      = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase injecte la session via le hash de l'URL après le clic sur le lien
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (password !== confirm)   return setError('Les mots de passe ne correspondent pas.')
    if (password.length < 8)    return setError('Minimum 8 caractères.')
    setLoading(true)

    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setLoading(false); return }

    navigate('/login')
  }

  if (!ready) return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-center px-6">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted text-sm">Vérification du lien…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-4xl font-semibold mb-1">Nouveau mot de passe</h1>
        <p className="text-muted text-sm mb-8">Choisissez un mot de passe sécurisé.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-muted mb-1.5" htmlFor="pw">Nouveau mot de passe</label>
            <input
              id="pw" type="password" required autoComplete="new-password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              className="w-full bg-surface2 border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors duration-150"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5" htmlFor="confirm">Confirmer</label>
            <input
              id="confirm" type="password" required autoComplete="new-password"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface2 border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors duration-150"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gold text-bg font-semibold hover:bg-[#d4ae58] disabled:opacity-50 transition-colors duration-150 cursor-pointer"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
