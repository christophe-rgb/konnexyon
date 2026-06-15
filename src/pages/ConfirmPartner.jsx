import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CheckCircle, XCircle } from 'lucide-react'

export default function ConfirmPartner() {
  const [params]  = useSearchParams()
  const token     = params.get('token')
  const [status,  setStatus]  = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Lien invalide.'); return }
    validate()
  }, [token])

  const validate = async () => {
    const { data, error } = await supabase.rpc('confirm_partner_token', { p_token: token })

    if (error || !data?.success) {
      setStatus('error')
      setMessage(data?.error || 'Lien invalide ou expiré.')
    } else {
      setStatus('success')
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <>
            <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted text-sm">Validation en cours…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-gold/10 border border-[rgba(201,168,76,0.3)] flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={36} className="text-gold" strokeWidth={1.5} />
            </div>
            <h1 className="font-serif text-3xl font-semibold mb-2">Confirmation validée</h1>
            <p className="text-muted text-sm leading-relaxed mb-6">
              Votre participation au couple a été confirmée. Le profil est maintenant entièrement actif.
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 rounded-xl bg-gold text-bg font-semibold hover:bg-[#d4ae58] transition-colors duration-150"
            >
              Se connecter
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-900/10 border border-red-900/30 flex items-center justify-center mx-auto mb-5">
              <XCircle size={36} className="text-red-400" strokeWidth={1.5} />
            </div>
            <h1 className="font-serif text-3xl font-semibold mb-2 text-red-400">Lien invalide</h1>
            <p className="text-muted text-sm leading-relaxed mb-6">{message}</p>
            <Link to="/login" className="text-gold text-sm hover:underline">
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
