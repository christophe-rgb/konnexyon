import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { Wordmark, Quill } from '../components/Logo'
import { lireSwipes, oublierSwipes } from '../lib/swipesEnAttente'

/**
 * Participer — l'inscription, dans l'ordre ou elle a du sens.
 *
 * Le visiteur a deja swipe : son geste est en attente. On lui demande
 * une adresse, on cree le compte, on valide ses swipes, et on l'envoie
 * ecrire sa ligne. Le profil vient apres, de ce qu'il aura ecrit — pas
 * d'un formulaire a remplir avant d'avoir rien vu.
 */
export default function Participer() {
  const navigate     = useNavigate()
  const fetchProfile = useAuthStore(s => s.fetchProfile)

  const enAttente = lireSwipes()
  const [prenom,   setPrenom]   = useState('')
  const [email,    setEmail]    = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur,   setErreur]   = useState('')
  const [encours,  setEncours]  = useState(false)

  const participer = async e => {
    e.preventDefault()
    setErreur('')
    if (!prenom.trim())        { setErreur('Votre prénom : c’est lui qui signera votre ligne.'); return }
    if (motDePasse.length < 8) { setErreur('Huit caractères au minimum pour le mot de passe.'); return }

    setEncours(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password: motDePasse })
      if (error) { setErreur(error.message); return }
      if (!data.user) { setErreur('Ce compte existe déjà. Connectez-vous.'); return }

      // Le prenom est demande des l'inscription : c'est la seule identite
      // du site, celle qui signe la ligne en vitrine. Sans lui, tout le
      // monde s'appelait "Anonyme" sous une page qui promet de decouvrir
      // une personne.
      const { error: erreurProfil } = await supabase.from('profiles').insert({
        id: data.user.id,
        email_1: email,
        display_name: prenom.trim().slice(0, 40),
        email_1_confirmed: true,
      })
      if (erreurProfil) { setErreur('Compte créé, mais le profil n’a pas suivi. Réessayez.'); return }

      // Le geste fait avant l'inscription devient une vraie connexion.
      // Le quota du jour s'applique : la fonction s'arrête quand il est
      // atteint et rend ce qu'elle a pu faire.
      if (enAttente.length) {
        await supabase.rpc('valider_swipes', { p_auteurs: enAttente }).catch(() => {})
        oublierSwipes()
      }

      await fetchProfile(data.user.id)
      navigate('/mot-du-jour')
    } finally {
      setEncours(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--encre)', color: 'var(--ivoire)' }}>
      <header style={{ padding: '20px clamp(20px, 5vw, 44px)' }}>
        <Link to="/" aria-label="Konnexyon, accueil"><Wordmark size={20} tone="or" /></Link>
      </header>

      <div style={{ maxWidth: 420, margin: '0 auto', padding: '10px clamp(20px, 6vw, 28px) 60px' }}>
        <div style={{ textAlign: 'center' }}>
          <Quill size={44} tone="or" style={{ marginBottom: 22 }} />
          <h1 style={{
            fontFamily: 'Cormorant, serif', fontWeight: 500,
            fontSize: 'clamp(1.8rem, 7vw, 2.4rem)', lineHeight: 1.15,
          }}>
            À vous d’écrire
          </h1>

          <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(242,238,230,0.55)', marginTop: 14 }}>
            {enAttente.length === 0
              ? 'Un prénom, une adresse, un mot de passe. Et vous écrivez votre ligne du jour.'
              : enAttente.length === 1
                ? 'Une ligne vous a retenu. Votre compte créé, la connexion part.'
                : `${enAttente.length} lignes vous ont retenu. Votre compte créé, les connexions partent.`}
          </p>
        </div>

        <form onSubmit={participer} style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="prenom" style={etiquette}>Prénom</label>
            <input
              id="prenom" type="text" required autoComplete="given-name"
              value={prenom} onChange={e => setPrenom(e.target.value.slice(0, 40))}
              placeholder="Celui qui signera votre ligne" style={champ}
            />
          </div>

          <div>
            <label htmlFor="email" style={etiquette}>Adresse e-mail</label>
            <input
              id="email" type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.fr" style={champ}
            />
          </div>

          <div>
            <label htmlFor="mdp" style={etiquette}>Mot de passe</label>
            <input
              id="mdp" type="password" required autoComplete="new-password"
              value={motDePasse} onChange={e => setMotDePasse(e.target.value)}
              placeholder="Huit caractères au minimum" style={champ}
            />
          </div>

          {erreur && (
            <p role="alert" style={{
              fontSize: 12, lineHeight: 1.6, padding: '10px 13px', borderRadius: 3,
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
              color: 'rgba(248,113,113,0.95)',
            }}>
              {erreur}
            </p>
          )}

          <button type="submit" disabled={encours} className="btn btn-continuer" style={{ marginTop: 6 }}>
            {encours ? 'Un instant…' : 'Écrire ma ligne'}
            {!encours && <ArrowRight size={14} strokeWidth={1.7} />}
          </button>

          <p style={{ fontSize: 11, lineHeight: 1.75, color: 'rgba(242,238,230,0.35)', textAlign: 'center' }}>
            En continuant, vous acceptez les{' '}
            <Link to="/cgu" style={{ color: 'rgba(201,168,76,0.8)' }}>conditions</Link> et la{' '}
            <Link to="/confidentialite" style={{ color: 'rgba(201,168,76,0.8)' }}>politique de confidentialité</Link>.
          </p>

          <p style={{ fontSize: 12, color: 'rgba(242,238,230,0.45)', textAlign: 'center', marginTop: 8 }}>
            Déjà inscrit ? <Link to="/login" style={{ color: 'var(--or)' }}>Entrer</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

const etiquette = {
  display: 'block', fontSize: 10, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: 'rgba(201,168,76,0.75)', marginBottom: 7,
}

const champ = {
  width: '100%',
  background: 'rgba(242,238,230,0.04)',
  border: '1px solid rgba(201,168,76,0.22)',
  borderRadius: 3, padding: '13px 15px',
  color: 'rgba(242,238,230,0.95)',
  fontFamily: 'Inter, sans-serif', fontSize: 14,
  outline: 'none',
}
