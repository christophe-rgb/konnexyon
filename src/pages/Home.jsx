import { Link } from 'react-router-dom'
import { Quill, Wordmark } from '../components/Logo'

/**
 * Page d'accueil publique — d'après la charte « rencontre par l'écriture ».
 * Fond ivoire, encre pour le texte, l'or réservé aux accroches et à l'action.
 */

const ETAPES = [
  {
    n: '01',
    titre: 'Vous écrivez',
    texte: 'Quelques questions, pas de formulaire. Ce que vous répondez tient lieu de profil — il n’y a rien d’autre à remplir.',
  },
  {
    n: '02',
    titre: 'Vous lisez',
    texte: 'Des réponses, pas des visages. Vous découvrez les gens par ce qu’ils écrivent, dans l’ordre où ils ont écrit.',
  },
  {
    n: '03',
    titre: 'Vous écrivez à quelqu’un',
    texte: 'Une phrase vous intrigue, vous répondez. La conversation commence là où elle a du sens.',
  },
]

const QUESTIONS = [
  'Une chose que tu ne dis presque jamais.',
  'Quelle phrase pourrait te faire changer d’avis ?',
  'Quel souvenir n’as-tu jamais raconté correctement ?',
  'Qu’est-ce qui te fait immédiatement apprécier quelqu’un ?',
  'Quelle conversation aimerais-tu avoir ce soir ?',
  'Quelle est la dernière chose qui t’a vraiment surpris ?',
]

export default function Home() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ivoire)', color: 'var(--encre)', overflowX: 'hidden' }}>

      {/* ── barre ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px clamp(20px, 5vw, 56px)',
        maxWidth: 1180, margin: '0 auto',
      }}>
        <Link to="/" aria-label="Konnexyon, accueil">
          <Wordmark size={22} tone="encre" />
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px, 3vw, 34px)' }}>
          <a href="#lire"    style={navLink} className="hidden sm:inline">Découvrir</a>
          <a href="#ecrire"  style={navLink} className="hidden sm:inline">Écrire</a>
          <a href="#apropos" style={navLink} className="hidden sm:inline">À propos</a>
          <Link to="/login" style={{ ...navLink, color: 'var(--or)' }}>Entrer</Link>
        </nav>
      </header>

      {/* ── accroche ── */}
      <section style={{
        maxWidth: 1180, margin: '0 auto',
        padding: 'clamp(28px, 7vw, 76px) clamp(20px, 5vw, 56px) clamp(48px, 9vw, 96px)',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 32,
      }}>
        <div className="animate-fade-in-up" style={{ animationFillMode: 'both', maxWidth: 620 }}>
          <h1 style={{
            fontFamily: 'Cormorant, serif',
            fontSize: 'clamp(2.1rem, 6.4vw, 3.9rem)',
            fontWeight: 500, lineHeight: 1.13, letterSpacing: '-0.005em',
          }}>
            Vous ne choisissez pas un visage.<br />
            Vous découvrez une personne.
          </h1>

          <p style={{
            fontFamily: 'Cormorant, serif', fontStyle: 'italic',
            fontSize: 'clamp(1.2rem, 3.4vw, 1.75rem)',
            color: 'var(--or)', marginTop: 18,
          }}>
            Commencez par lire.
          </p>

          <div style={{ width: 74, height: 1, background: 'rgba(11,11,11,0.18)', margin: '30px 0 28px' }} />

          <Link to="/register" className="btn btn-lire">Commencer</Link>

          <p style={{ fontSize: 13, lineHeight: 1.85, color: 'rgba(11,11,11,0.6)', marginTop: 30 }}>
            Pas de photos. Pas de swipe.<br />
            Seulement des mots.
          </p>
        </div>

        {/* plume — décorative, retirée sur petit écran */}
        <div className="hidden md:block animate-fade-in" style={{ animationFillMode: 'both', animationDelay: '250ms', opacity: 0.9 }}>
          <Quill size={230} tone="encre" />
        </div>
      </section>

      {/* ── comment ça marche ── */}
      <section id="ecrire" style={{ background: 'var(--encre)', color: 'var(--ivoire)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(52px, 9vw, 96px) clamp(20px, 5vw, 56px)' }}>
          <p style={sectionLabel}>Comment ça marche</p>

          <div style={{
            display: 'grid', gap: 'clamp(28px, 4vw, 52px)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            marginTop: 44,
          }}>
            {ETAPES.map((e, i) => (
              <div key={e.n} className="animate-fade-in-up"
                   style={{ animationFillMode: 'both', animationDelay: `${i * 110}ms` }}>
                <p style={{ fontSize: 11, letterSpacing: '0.22em', color: 'var(--or)' }}>{e.n}</p>
                <h2 style={{
                  fontFamily: 'Cormorant, serif', fontSize: '1.65rem', fontWeight: 500,
                  margin: '12px 0 10px',
                }}>
                  {e.titre}
                </h2>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(242,238,230,0.62)' }}>
                  {e.texte}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── les questions ── */}
      <section id="lire" style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(52px, 9vw, 96px) clamp(20px, 5vw, 56px)' }}>
        <p style={{ ...sectionLabel, color: 'rgba(11,11,11,0.45)' }}>Ce qu’on vous demandera</p>

        <ul style={{ listStyle: 'none', padding: 0, margin: '40px 0 0', maxWidth: 720 }}>
          {QUESTIONS.map((q, i) => (
            <li key={q} className="animate-fade-in-up"
                style={{
                  animationFillMode: 'both', animationDelay: `${i * 70}ms`,
                  display: 'flex', gap: 18, alignItems: 'baseline',
                  padding: '17px 0',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(11,11,11,0.08)',
                }}>
              <span style={{ color: 'var(--or)', fontSize: 13, flexShrink: 0 }}>—</span>
              <span style={{
                fontFamily: 'Cormorant, serif', fontStyle: 'italic',
                fontSize: 'clamp(1.1rem, 3.6vw, 1.4rem)', lineHeight: 1.5,
              }}>
                {q}
              </span>
            </li>
          ))}
        </ul>
      </section>

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
            Pas de swipe.<br />
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

const sectionLabel = {
  fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase',
  color: 'rgba(242,238,230,0.45)',
}
