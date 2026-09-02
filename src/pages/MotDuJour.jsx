import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ArrowRight } from 'lucide-react'
import { useDailyWord } from '../hooks/useDailyWord'
import { MAX_LINE_LENGTH, normalizeLine, formatCarnetDate } from '../lib/dailyWord'
import { QUESTIONS_INSPIRATION } from '../lib/prompts'
import { Quill } from '../components/Logo'

/**
 * Écrire — le mot du jour et la ligne qu'il fait remonter.
 *
 * Une fois la ligne écrite, on ne trie pas des cartes : on va lire.
 * L'écran renvoie vers /lire, c'est tout.
 */
export default function MotDuJour() {
  const navigate = useNavigate()
  const { loading, word, myLine, sending, submitLine } = useDailyWord()
  const [draft, setDraft] = useState('')
  const [inspiration, setInspiration] = useState(null)

  const written = normalizeLine(draft).length

  return (
    <div className="pb-nav" style={{
      minHeight: '100dvh', background: 'var(--encre)', color: 'var(--ivoire)',
      display: 'flex', flexDirection: 'column',
    }}>

      <header className="flex items-center justify-between" style={{ padding: '20px clamp(18px, 5vw, 28px) 6px' }}>
        <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)' }}>
          {word ? formatCarnetDate(word.publish_date) : '—'}
        </span>
        <button onClick={() => navigate('/carnet')} aria-label="Mon carnet"
                className="flex items-center" style={{
                  gap: 7, padding: '7px 13px', borderRadius: 3,
                  background: 'transparent', border: '1px solid rgba(201,168,76,0.3)',
                  color: 'var(--or)', fontSize: 10, letterSpacing: '0.14em',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}>
          <BookOpen size={13} strokeWidth={1.5} />
          Mon carnet
        </button>
      </header>

      {loading ? (
        <Centre><Spinner /></Centre>
      ) : !word ? (
        <Centre>
          <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.6rem' }}>Pas de mot aujourd’hui</p>
          <p style={{ fontSize: 13, color: 'rgba(242,238,230,0.45)', lineHeight: 1.7, marginTop: 10 }}>
            Le prochain arrive bientôt. Revenez tout à l’heure.
          </p>
        </Centre>
      ) : myLine ? (
        /* ── ligne écrite : on va lire ── */
        <Centre>
          <Quill size={52} tone="or" style={{ marginBottom: 26 }} />
          <p style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)' }}>
            {word.word}
          </p>
          <p style={{
            fontFamily: 'Cormorant, serif', fontStyle: 'italic',
            fontSize: 'clamp(1.35rem, 5.4vw, 1.8rem)', lineHeight: 1.6,
            margin: '16px 0 4px', maxWidth: 460,
          }}>
            « {myLine} »
          </p>
          <p style={{ fontSize: 13, color: 'rgba(242,238,230,0.45)', lineHeight: 1.75, marginTop: 18, maxWidth: 380 }}>
            Ta ligne est déposée. Les autres te sont ouvertes.
          </p>
          <button onClick={() => navigate('/lire')} className="btn btn-continuer" style={{ marginTop: 30 }}>
            Lire ce qu’ils ont écrit
            <ArrowRight size={14} strokeWidth={1.7} />
          </button>
        </Centre>
      ) : (
        /* ── écrire sa ligne ── */
        <section className="flex-1 flex flex-col items-center justify-center animate-fade-in"
                 style={{ animationFillMode: 'both', gap: 32, padding: '0 clamp(20px, 6vw, 28px)' }}>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.55)', marginBottom: 12 }}>
              Le mot du jour
            </p>
            <h1 className="shine-text" style={{
              fontFamily: 'Cormorant, serif',
              fontSize: 'clamp(3rem, 15vw, 5rem)',
              fontWeight: 500, lineHeight: 1, letterSpacing: '0.02em',
            }}>
              {word.word}
            </h1>
          </div>

          <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* l'invite est une phrase, pas une étiquette : Cormorant, casse normale */}
            <label htmlFor="ligne-du-jour" style={{
              fontFamily: 'Cormorant, serif',
              fontSize: 'clamp(1.1rem, 4vw, 1.3rem)',
              lineHeight: 1.5,
              color: 'rgba(242,238,230,0.9)',
            }}>
              Qu’est-ce que ce mot fait remonter ?
            </label>

            <textarea
              id="ligne-du-jour"
              value={draft}
              onChange={e => setDraft(e.target.value.slice(0, MAX_LINE_LENGTH))}
              maxLength={MAX_LINE_LENGTH}
              rows={3}
              placeholder="Commence à écrire…"
              autoComplete="off"
              style={{
                width: '100%', resize: 'none',
                background: 'rgba(242,238,230,0.04)',
                border: '1px solid rgba(201,168,76,0.22)',
                borderRadius: 3, padding: '15px 17px',
                color: 'rgba(242,238,230,0.95)',
                fontFamily: 'Cormorant, serif', fontSize: '1.25rem', lineHeight: 1.6,
                outline: 'none',
              }}
            />

            <div className="flex items-center justify-between">
              <span aria-live="polite" style={{
                fontSize: 11, letterSpacing: '0.1em',
                color: written >= MAX_LINE_LENGTH ? 'rgba(248,113,113,0.9)' : 'rgba(242,238,230,0.38)',
              }}>
                {written} / {MAX_LINE_LENGTH}
              </span>
              <button
                onClick={() => setInspiration(pickOther(inspiration))}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 11, letterSpacing: '0.1em', color: 'rgba(242,238,230,0.38)',
                  textDecoration: 'underline', textUnderlineOffset: 3,
                }}
              >
                Rien ne vient ?
              </button>
            </div>

            {inspiration && (
              <p className="animate-fade-in" style={{
                fontFamily: 'Cormorant, serif', fontStyle: 'italic', fontSize: '1.05rem',
                color: 'rgba(201,168,76,0.8)', lineHeight: 1.55, animationFillMode: 'both',
              }}>
                {inspiration}
              </p>
            )}

            <button
              className="btn btn-continuer"
              onClick={async () => { const ok = await submitLine(draft); if (ok) setDraft('') }}
              disabled={sending || written === 0}
              style={{ marginTop: 6, width: '100%' }}
            >
              {sending ? 'Envoi…' : 'Continuer'}
              {!sending && <ArrowRight size={14} strokeWidth={1.7} />}
            </button>

            <p style={{ fontSize: 11, color: 'rgba(242,238,230,0.32)', lineHeight: 1.7, textAlign: 'center' }}>
              Une ligne par jour. Tu liras les autres une fois la tienne écrite.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

// une question au hasard, jamais deux fois la même d'affilée
function pickOther(current) {
  const pool = QUESTIONS_INSPIRATION.filter(q => q !== current)
  return pool[Math.floor(Math.random() * pool.length)]
}

function Centre({ children }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center"
         style={{ padding: '0 clamp(24px, 7vw, 32px)' }}>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div role="status" aria-label="Chargement…" className="w-8 h-8 rounded-full animate-spin"
         style={{ border: '2px solid rgba(201,168,76,0.25)', borderTopColor: 'var(--or)' }} />
  )
}
