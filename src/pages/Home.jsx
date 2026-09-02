import { useEffect, useState, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Quill, Wordmark } from '../components/Logo'
import { ajouterSwipe } from '../lib/swipesEnAttente'

const SwipeStack = lazy(() => import('../components/SwipeStack'))

/**
 * Page d'accueil publique — d'après la charte « connexion par l'écriture ».
 * Fond ivoire, encre pour le texte, l'or réservé aux accroches et à l'action.
 */

export default function Home() {
  const navigate = useNavigate()
  const [mot,        setMot]        = useState(null)
  const [cartes,     setCartes]     = useState([])
  const [chargement, setChargement] = useState(true)

  // L'apercu est public : il montre le mot du jour et quelques lignes,
  // sans age, sans ville, et sans moyen de joindre leur auteur.
  useEffect(() => {
    let vivant = true
    Promise.all([
      supabase.rpc('get_apercu_du_jour', { p_limite: 6 }),
      supabase.rpc('get_word_of_the_day'),
    ])
      .then(([apercu, motDuJour]) => {
        if (!vivant) return
        // Le mot annonce est celui d'aujourd'hui, meme quand la pile se
        // complete avec les lignes des jours precedents.
        if (motDuJour?.data?.[0]?.word) setMot(motDuJour.data[0].word)
        const lignes = apercu?.data
        if (lignes?.length) {
          setCartes(lignes.map((l) => ({
            id: l.auteur, word: l.mot, line: l.ligne, pseudo: l.prenom,
          })))
        }
      })
      .catch(() => {})
      .finally(() => { if (vivant) setChargement(false) })
    return () => { vivant = false }
  }, [])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ivoire)', color: 'var(--encre)', overflowX: 'hidden' }}>

      {/* ── le premier ecran, entier : on arrive sur le swipe ── */}
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* ── barre ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px clamp(20px, 5vw, 56px)',
        // width explicite : dans une colonne flex, "margin: 0 auto" retrecit
        // l element a son contenu au lieu de l etirer, et la barre se pliait
        width: '100%', maxWidth: 1180, margin: '0 auto',
      }}>
        <Link to="/" aria-label="Konnexyon, accueil">
          <Wordmark size={22} tone="encre" />
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px, 3vw, 34px)' }}>
          <a href="#apropos" style={navLink} className="hidden sm:inline">À propos</a>
          <Link to="/login" style={{ ...navLink, color: 'var(--or)' }}>Entrer</Link>
        </nav>
      </header>

      {/* ── la pile : elle occupe tout ce qui reste de l'ecran ── */}
      <section style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        width: '100%', maxWidth: 1180, margin: '0 auto',
        padding: 'clamp(12px, 3vw, 30px) clamp(20px, 5vw, 56px) clamp(24px, 4vw, 44px)',
      }}>
        <div className="animate-fade-in-up" style={{ animationFillMode: 'both', textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'Cormorant, serif',
            fontSize: 'clamp(1.28rem, 4.4vw, 2.5rem)',
            fontStyle: 'italic', fontWeight: 400, lineHeight: 1.35,
            // sur telephone les deux lignes se cassaient en quatre et
            // laissaient "inspiration." et "ame." orphelines : le plancher
            // les fait tenir, et balance repartit ce qui deborde quand meme
            textWrap: 'balance',
            color: 'rgba(11,11,11,0.62)',
          }}>
            Partagez une phrase, une inspiration.<br />
            Découvrez une personne, une âme.
          </h1>

          {mot && (
            <div style={{ marginTop: 'clamp(20px, 4vw, 34px)' }}>
              <p style={{
                fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase',
                color: 'rgba(11,11,11,0.38)',
              }}>
                Le mot du jour
              </p>
              <p className="shine-text" style={{
                fontFamily: 'Cormorant, serif',
                fontSize: 'clamp(2.4rem, 9vw, 4rem)',
                fontWeight: 500, lineHeight: 1.05,
                color: 'var(--or)',
                marginTop: 6,
              }}>
                {mot}
              </p>
            </div>
          )}
        </div>

        {/* la pile est sur fond encre, comme dans l'app : le visiteur voit
            exactement ce qu'il aura */}
        <div className="ink animate-fade-in" style={{
          marginTop: 28, padding: '10px 0 22px',
          animationFillMode: 'both', animationDelay: '120ms',
          maxWidth: 520, marginInline: 'auto',
        }}>
          {chargement ? (
            <div className="flex justify-center" style={{ padding: '90px 0' }} role="status" aria-label="Chargement…">
              <div className="w-7 h-7 rounded-full animate-spin"
                   style={{ border: '2px solid rgba(201,168,76,0.22)', borderTopColor: 'var(--or)' }} />
            </div>
          ) : (
            <Suspense fallback={<div style={{ height: 380 }} />}>
              <SwipeStack
                profiles={cartes}
                counterLabel="Un aperçu de ce qui s’écrit aujourd’hui"
                onLike={auteur => {
                  // le geste est garde : il deviendra une vraie connexion
                  // une fois le compte cree
                  ajouterSwipe(auteur)
                  navigate('/participer')
                }}
                onPass={() => {}}
                vide={{
                  titre: 'C’est à vous, maintenant.',
                  texte: 'Écrivez votre ligne du jour, et les autres s’ouvriront.',
                }}
              />
            </Suspense>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 26 }}>
          <Link to="/participer" className="btn btn-continuer">
            Moi aussi je veux participer
            <ArrowRight size={14} strokeWidth={1.7} />
          </Link>
          <p style={{ fontSize: 12, lineHeight: 1.8, color: 'rgba(11,11,11,0.5)', marginTop: 16 }}>
            Votre ligne du jour, et le profil suit.
          </p>
        </div>
      </section>
      </div>

      {/* ── la papeterie ── */}

      {/* ── signature ── */}
      <section id="apropos" style={{ background: 'var(--encre)', color: 'var(--ivoire)' }}>
        <div style={{
          maxWidth: 1180, margin: '0 auto',
          padding: 'clamp(60px, 11vw, 118px) clamp(20px, 5vw, 56px)',
          textAlign: 'center',
        }}>
          <Quill size={54} tone="or" style={{ marginBottom: 26 }} />

          <p style={{
            fontFamily: 'Cormorant, serif',
            fontSize: 'clamp(1.7rem, 6vw, 2.7rem)',
            fontWeight: 500, lineHeight: 1.32,
          }}>
            Pas de photo.<br />
            Pas de filtre.<br />
            <span className="shine-text">Seulement vous.</span>
          </p>

          <div style={{ marginTop: 44, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-continuer">Commencer à écrire</Link>
            <Link to="/login"    className="btn btn-ecrire">J’ai déjà un compte</Link>
          </div>
        </div>
      </section>

      {/* ── pied ── */}
      <footer style={{
        maxWidth: 1180, margin: '0 auto',
        padding: '38px clamp(20px, 5vw, 56px) 52px',
        display: 'flex', flexWrap: 'wrap', gap: 18,
        alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid rgba(11,11,11,0.08)',
      }}>
        <Wordmark size={16} tone="encre" />
        <nav style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          <Link to="/cgu"             style={footLink}>Conditions</Link>
          <Link to="/confidentialite" style={footLink}>Confidentialité</Link>
          <Link to="/contact"         style={footLink}>Contact</Link>
        </nav>
      </footer>
    </div>
  )
}

const navLink = {
  fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'rgba(11,11,11,0.65)', textDecoration: 'none',
}

const footLink = {
  fontSize: 11, letterSpacing: '0.1em',
  color: 'rgba(11,11,11,0.45)', textDecoration: 'none',
}


