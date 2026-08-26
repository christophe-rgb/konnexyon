import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { toast } from '../components/Toast'
import { computeStreak, formatCarnetDate } from '../lib/dailyWord'
import { DEMO_CARNET } from '../lib/demo'

/**
 * Mon carnet — les lignes écrites par le membre, de la plus récente à la
 * plus ancienne. Lecture seule : ni édition ni suppression pour l'instant.
 * L'export PDF viendra plus tard.
 */
export default function Carnet() {
  const navigate = useNavigate()
  const demoMode = useAuthStore(s => s.demoMode)
  const profile  = useAuthStore(s => s.profile)

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (demoMode) { if (alive) setEntries(DEMO_CARNET); return }
        if (!profile?.id) return
        const { data, error } = await supabase.rpc('get_my_carnet')
        if (!alive) return
        if (error) {
          toast('Impossible de charger votre carnet — ' + (error.message || 'réessayez'), 'error')
          return
        }
        setEntries(data || [])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [profile?.id, demoMode])

  const streak = useMemo(() => computeStreak(entries.map(e => e.publish_date)), [entries])

  return (
    <div className="pb-nav" style={{ minHeight: '100dvh' }}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '22px 28px 40px' }}>

        {/* ── retour ── */}
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="flex items-center gap-2"
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'rgba(28,24,20,0.45)', fontSize: 11,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Retour
        </button>

        {/* ── titre ── */}
        <h1 className="animate-fade-in-up" style={{
          fontFamily: 'Cormorant, serif',
          fontSize: 'clamp(2.4rem, 9vw, 3.2rem)',
          fontWeight: 600, color: '#1C1814',
          marginTop: 34, lineHeight: 1.05,
          animationFillMode: 'both',
        }}>
          Mon carnet
        </h1>

        {/* ── compteurs ── */}
        <p className="animate-fade-in-up delay-100" style={{
          marginTop: 14, fontSize: 11, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'rgba(201,168,76,1)',
          animationFillMode: 'both',
        }}>
          {entries.length} ligne{entries.length > 1 ? 's' : ''} écrite{entries.length > 1 ? 's' : ''}
          {streak > 0 && <> · {streak} jour{streak > 1 ? 's' : ''} d’affilée</>}
        </p>

        <div className="separator-gold" style={{ marginTop: 30, marginBottom: 8 }} />

        {/* ── les lignes ── */}
        {loading ? (
          <div className="flex justify-center" style={{ padding: '60px 0' }} role="status" aria-label="Chargement…">
            <div className="w-7 h-7 rounded-full animate-spin"
                 style={{ border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C' }} />
          </div>
        ) : entries.length === 0 ? (
          <EmptyCarnet onWrite={() => navigate('/mot-du-jour')} />
        ) : (
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {entries.map((entry, i) => (
              <li
                key={entry.id}
                className="animate-fade-in-up"
                style={{ padding: '38px 0 0', animationFillMode: 'both', animationDelay: `${Math.min(i, 8) * 60}ms` }}
              >
                <p style={{
                  fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: 'rgba(28,24,20,0.35)', marginBottom: 10,
                }}>
                  {formatCarnetDate(entry.publish_date)}
                </p>

                <h2 style={{
                  fontFamily: 'Cormorant, serif',
                  fontSize: '1.35rem', fontWeight: 600,
                  color: 'rgba(201,168,76,1)',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}>
                  {entry.word}
                </h2>

                <p style={{
                  fontFamily: 'Cormorant, serif',
                  fontSize: 'clamp(1.3rem, 5vw, 1.65rem)',
                  fontStyle: 'italic', lineHeight: 1.72,
                  color: '#1C1814',
                }}>
                  {entry.line}
                </p>
              </li>
            ))}
          </ol>
        )}

        {/* ── la papeterie — proposée seulement à qui écrit déjà ── */}
        {!loading && entries.length > 0 && (
          <div style={{ marginTop: 48 }}>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyCarnet({ onWrite }) {
  return (
    <div style={{ padding: '54px 0', textAlign: 'center' }}>
      <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', color: 'rgba(28,24,20,0.75)', lineHeight: 1.5 }}>
        Votre carnet est encore vierge.
      </p>
      <p style={{ fontSize: 13, color: 'rgba(28,24,20,0.5)', lineHeight: 1.7, marginTop: 10 }}>
        Écrivez votre première ligne, elle s’inscrira ici.
      </p>
      <button
        onClick={onWrite}
        className="btn-gold"
        style={{ marginTop: 26, padding: '13px 26px', borderRadius: 14, fontSize: 12, border: 'none', cursor: 'pointer' }}
      >
        Le mot du jour
      </button>
    </div>
  )
}
