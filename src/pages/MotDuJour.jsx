import { useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useDailyWord } from '../hooks/useDailyWord'
import { MAX_LINE_LENGTH, DAILY_CONNECTION_QUOTA, normalizeLine, formatCarnetDate } from '../lib/dailyWord'

const SwipeStack = lazy(() => import('../components/SwipeStack'))

const BG   = '#050505'
const GOLD = '#C9A84C'

export default function MotDuJour() {
  const navigate = useNavigate()
  const { loading, word, myLine, responses, left, sending, submitLine, connect } = useDailyWord()
  const [draft, setDraft] = useState('')
  const [passed, setPassed] = useState([])

  // Toutes les lignes du jour répondent au même mot : on le recopie dans
  // chaque item plutôt que de le faire traverser SwipeStack en prop.
  // L'id de l'item est celui de l'auteur — c'est lui qu'on connecte.
  const items = responses
    .filter(r => !passed.includes(r.user_id))
    .map(r => ({ id: r.user_id, pseudo: r.pseudo, line: r.line, word: word?.word }))

  const remaining = normalizeLine(draft).length

  return (
    <div style={{ minHeight: '100dvh', background: BG, color: 'rgba(245,240,232,0.92)', display: 'flex', flexDirection: 'column' }}
         className="pb-nav">

      {/* ── en-tête ── */}
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)' }}>
          {word ? formatCarnetDate(word.publish_date) : '—'}
        </span>
        <button
          onClick={() => navigate('/carnet')}
          className="erb-btn flex items-center gap-2"
          aria-label="Mon carnet"
          style={{
            padding: '6px 13px', borderRadius: 999,
            background: 'rgba(201,168,76,0.07)',
            border: '1px solid rgba(201,168,76,0.28)',
            color: GOLD, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          <BookOpen size={13} strokeWidth={1.5} />
          Mon carnet
        </button>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center" role="status" aria-label="Chargement…">
          <div className="w-8 h-8 rounded-full animate-spin"
               style={{ border: '2px solid rgba(201,168,76,0.25)', borderTopColor: GOLD }} />
        </div>
      ) : !word ? (
        <NoWord />
      ) : !myLine ? (
        /* ── 1. écrire sa ligne ── */
        <section className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in"
                 style={{ animationFillMode: 'both', gap: 30 }}>

          <WordHero word={word.word} />

          <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label htmlFor="ligne-du-jour" style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.7)' }}>
              Votre ligne
            </label>

            <textarea
              id="ligne-du-jour"
              className="input-gold"
              value={draft}
              onChange={e => setDraft(e.target.value.slice(0, MAX_LINE_LENGTH))}
              maxLength={MAX_LINE_LENGTH}
              rows={3}
              placeholder="Ce que ce mot fait remonter…"
              autoComplete="off"
              style={{
                width: '100%', resize: 'none',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(201,168,76,0.22)',
                borderRadius: 14, padding: '14px 16px',
                color: 'rgba(245,240,232,0.95)',
                fontFamily: 'Cormorant, serif', fontSize: '1.2rem', lineHeight: 1.6,
                outline: 'none',
              }}
            />

            <div className="flex items-center justify-between">
              <span aria-live="polite" style={{
                fontSize: 11, letterSpacing: '0.1em',
                color: remaining >= MAX_LINE_LENGTH ? 'rgba(248,113,113,0.9)' : 'rgba(245,240,232,0.4)',
              }}>
                {remaining} / {MAX_LINE_LENGTH}
              </span>
              <span style={{ fontSize: 11, letterSpacing: '0.1em', color: 'rgba(245,240,232,0.35)' }}>
                Une ligne par jour
              </span>
            </div>

            <button
              className="btn-gold"
              onClick={async () => { const ok = await submitLine(draft); if (ok) setDraft('') }}
              disabled={sending || remaining === 0}
              style={{
                marginTop: 4, padding: '14px', borderRadius: 14,
                fontSize: 13, border: 'none',
                cursor: sending || remaining === 0 ? 'not-allowed' : 'pointer',
                opacity: sending || remaining === 0 ? 0.45 : 1,
              }}
            >
              {sending ? 'Envoi…' : 'Écrire ma ligne'}
            </button>

            <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.35)', lineHeight: 1.6, textAlign: 'center' }}>
              Vous découvrirez les lignes des autres une fois la vôtre écrite.
            </p>
          </div>
        </section>
      ) : (
        /* ── 2. découvrir les lignes des autres ── */
        <section className="flex-1 flex flex-col animate-fade-in" style={{ animationFillMode: 'both' }}>

          <MyLine word={word.word} line={myLine} />

          {left === 0 && (
            <p role="status" className="mx-5 mb-1" style={{
              padding: '9px 14px', borderRadius: 12, textAlign: 'center',
              background: 'rgba(248,113,113,0.07)',
              border: '1px solid rgba(248,113,113,0.22)',
              color: 'rgba(248,113,113,0.9)', fontSize: 12, lineHeight: 1.5,
            }}>
              Vos {DAILY_CONNECTION_QUOTA} connexions du jour sont utilisées. Vous pouvez continuer à lire — le compteur repart demain.
            </p>
          )}

          <Suspense fallback={<div className="flex-1" />}>
            <SwipeStack
              variant="word"
              profiles={items}
              counterLabel={`${left} connexion${left > 1 ? 's' : ''} sur ${DAILY_CONNECTION_QUOTA} aujourd’hui`}
              onLike={userId => connect(userId)}
              onPass={userId => setPassed(p => p.includes(userId) ? p : [...p, userId])}
            />
          </Suspense>
        </section>
      )}
    </div>
  )
}

function WordHero({ word }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.55)', marginBottom: 10 }}>
        Le mot du jour
      </p>
      <h1 className="shine-text" style={{
        fontFamily: 'Cormorant, serif',
        fontSize: 'clamp(3rem, 15vw, 5rem)',
        fontWeight: 600, lineHeight: 1, letterSpacing: '0.02em',
      }}>
        {word}
      </h1>
    </div>
  )
}

function MyLine({ word, line }) {
  return (
    <div className="px-6 pt-2 pb-4" style={{ textAlign: 'center' }}>
      <h1 className="shine-text" style={{
        fontFamily: 'Cormorant, serif',
        fontSize: 'clamp(1.9rem, 8vw, 2.6rem)',
        fontWeight: 600, lineHeight: 1.05,
      }}>
        {word}
      </h1>
      <p style={{
        fontFamily: 'Cormorant, serif', fontStyle: 'italic',
        fontSize: '1.05rem', lineHeight: 1.5, marginTop: 8,
        color: 'rgba(245,240,232,0.6)',
      }}>
        « {line} »
      </p>
    </div>
  )
}

function NoWord() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8" style={{ gap: 14 }}>
      <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.6rem', color: 'rgba(245,240,232,0.85)' }}>
        Pas de mot aujourd’hui
      </p>
      <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.45)', lineHeight: 1.6 }}>
        Le prochain arrive bientôt. Revenez tout à l’heure.
      </p>
    </div>
  )
}
