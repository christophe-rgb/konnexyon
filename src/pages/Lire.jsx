import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { toast } from '../components/Toast'
import { formatIdentity } from '../lib/prompts'
import { Quill } from '../components/Logo'
import { DEMO_RESPONSES } from '../lib/demo'

/**
 * Découvrir — la liste de lecture du jour.
 *
 * Pas de swipe : on ne trie pas des visages, on lit une page. Chaque
 * carte porte une ligne écrite ce matin et mène au profil de son auteur.
 * Les lignes n'apparaissent qu'une fois la sienne écrite (règle appliquée
 * en base par get_reading_list).
 */
export default function Lire() {
  const navigate = useNavigate()
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (demoMode) {
          if (alive) setEntries(DEMO_RESPONSES.map(r => ({
            user_id: r.user_id, display_name: r.pseudo, age: 37, city: 'Lyon', line: r.line,
          })))
          return
        }
        if (!profile?.id) return
        const { data, error } = await supabase.rpc('get_reading_list')
        if (!alive) return
        if (error) {
          toast('Impossible de charger la lecture du jour — ' + (error.message || 'réessayez'), 'error')
          return
        }
        setEntries(data || [])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [profile?.id, demoMode])

  return (
    <div className="pb-nav" style={{ minHeight: '100dvh', background: 'var(--encre)', color: 'var(--ivoire)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '26px clamp(18px, 5vw, 32px) 40px' }}>

        <p style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.65)' }}>
          Aujourd’hui
        </p>
        <h1 style={{
          fontFamily: 'Cormorant, serif', fontWeight: 500,
          fontSize: 'clamp(2rem, 8vw, 2.8rem)', lineHeight: 1.1, marginTop: 8,
        }}>
          Ce qu’ils ont écrit
        </h1>

        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading ? (
            <div className="flex justify-center" style={{ padding: '60px 0' }} role="status" aria-label="Chargement…">
              <div className="w-7 h-7 rounded-full animate-spin"
                   style={{ border: '2px solid rgba(201,168,76,0.22)', borderTopColor: 'var(--or)' }} />
            </div>
          ) : entries.length === 0 ? (
            <RienALire onWrite={() => navigate('/mot-du-jour')} />
          ) : (
            entries.map((e, i) => (
              <article
                key={e.user_id}
                className="paper animate-fade-in-up"
                onClick={() => navigate(`/personne/${e.user_id}`)}
                style={{
                  padding: '20px 22px', cursor: 'pointer',
                  animationFillMode: 'both', animationDelay: `${Math.min(i, 8) * 60}ms`,
                  transition: 'transform var(--dur-mid) var(--ease-out)',
                }}
                onMouseEnter={ev => { ev.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={ev => { ev.currentTarget.style.transform = 'translateY(0)' }}
              >
                <header className="flex items-baseline justify-between" style={{ gap: 12 }}>
                  <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', fontWeight: 600, lineHeight: 1 }}>
                    {e.display_name}
                  </h2>
                  <span style={{ fontSize: 11, color: 'rgba(11,11,11,0.45)', whiteSpace: 'nowrap' }}>
                    {formatIdentity(e)}
                  </span>
                </header>

                <p style={{
                  fontFamily: 'Cormorant, serif', fontStyle: 'italic',
                  fontSize: '1.15rem', lineHeight: 1.62,
                  margin: '12px 0 16px',
                }}>
                  « {e.line} »
                </p>

                <span className="flex items-center justify-end" style={{
                  gap: 7, fontSize: 11, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'rgba(11,11,11,0.5)',
                }}>
                  Lire son profil
                  <ArrowRight size={13} strokeWidth={1.5} />
                </span>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function RienALire({ onWrite }) {
  return (
    <div style={{ textAlign: 'center', padding: '54px 0' }}>
      <Quill size={44} tone="or" style={{ marginBottom: 22 }} />
      <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', lineHeight: 1.45 }}>
        Rien à lire pour l’instant.
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.75, color: 'rgba(242,238,230,0.5)', marginTop: 10 }}>
        Écrivez votre ligne du jour — les autres s’ouvriront ensuite.
      </p>
      <button onClick={onWrite} className="btn btn-continuer" style={{ marginTop: 26 }}>
        Écrire ma ligne
      </button>
    </div>
  )
}
