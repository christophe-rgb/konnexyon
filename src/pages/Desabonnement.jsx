import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Wordmark, Quill } from '../components/Logo'

/**
 * Se désabonner du mot du jour.
 *
 * Accessible sans compte : le lien du courriel doit marcher même si la
 * personne n'est plus connectée. Le jeton ne permet que de se retirer
 * d'une liste — il ne donne accès à rien.
 *
 * Le retrait est immédiat, sans confirmation à cliquer : demander à
 * quelqu'un qui veut partir de le confirmer, c'est le retenir de force.
 */
export default function Desabonnement() {
  const [params] = useSearchParams()
  const jeton = params.get('t')
  const [etat, setEtat] = useState('en cours')   // 'en cours' | 'fait' | 'echec'
  const [prenom, setPrenom] = useState(null)

  useEffect(() => {
    if (!jeton) { setEtat('echec'); return }
    let vivant = true
    supabase.rpc('desabonner_mot_du_jour', { p_token: jeton })
      .then(({ data }) => {
        if (!vivant) return
        if (data?.ok) { setPrenom(data.prenom); setEtat('fait') }
        else setEtat('echec')
      })
      .catch(() => { if (vivant) setEtat('echec') })
    return () => { vivant = false }
  }, [jeton])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--encre)', color: 'var(--ivoire)' }}>
      <header style={{ padding: '20px clamp(20px, 5vw, 44px)' }}>
        <Link to="/" aria-label="Konnexyon, accueil"><Wordmark size={20} tone="or" /></Link>
      </header>

      <div style={{ maxWidth: 440, margin: '0 auto', padding: '60px clamp(20px, 6vw, 28px)', textAlign: 'center' }}>
        <Quill size={44} tone="or" style={{ marginBottom: 24 }} />

        {etat === 'en cours' && (
          <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.4rem', color: 'rgba(242,238,230,0.6)' }}>
            Un instant…
          </p>
        )}

        {etat === 'fait' && (
          <>
            <h1 style={{ fontFamily: 'Cormorant, serif', fontWeight: 500, fontSize: 'clamp(1.7rem, 6vw, 2.2rem)', lineHeight: 1.2 }}>
              C’est fait{prenom && prenom !== 'Anonyme' ? `, ${prenom}` : ''}.
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.85, color: 'rgba(242,238,230,0.55)', marginTop: 16 }}>
              Tu ne recevras plus le mot du jour par courriel.
              Ton compte reste ouvert, et le mot t’attend sur le site
              chaque matin si tu veux y passer.
            </p>
            <Link to="/lire" className="btn btn-continuer" style={{ marginTop: 28 }}>
              Aller au site
            </Link>
          </>
        )}

        {etat === 'echec' && (
          <>
            <h1 style={{ fontFamily: 'Cormorant, serif', fontWeight: 500, fontSize: 'clamp(1.7rem, 6vw, 2.2rem)', lineHeight: 1.2 }}>
              Ce lien n’est plus valable
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.85, color: 'rgba(242,238,230,0.55)', marginTop: 16 }}>
              Il a peut-être déjà servi. Tu peux couper l’envoi
              depuis tes réglages, ou nous écrire.
            </p>
            <div className="flex" style={{ gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
              <Link to="/settings" className="btn btn-continuer">Mes réglages</Link>
              <Link to="/contact"  className="btn btn-ecrire">Nous écrire</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
