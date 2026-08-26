import { useEffect, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LayoutList, Layers2, Map as MapIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { toast } from '../components/Toast'
import { formatIdentity } from '../lib/prompts'
import { compatibilityLabel } from '../lib/compatibility'
import { DAILY_CONNECTION_QUOTA } from '../lib/dailyWord'
import { useConnections } from '../hooks/useConnections'
import { useDailyWord } from '../hooks/useDailyWord'
import { Quill } from '../components/Logo'
import { DEMO_READING } from '../lib/demo'

const SwipeStack = lazy(() => import('../components/SwipeStack'))
const MapView = lazy(() => import('../components/MapView').catch(() => ({ default: () => (
  <div className="w-full h-full flex items-center justify-center"
       style={{ color: 'var(--or)', fontSize: 13, letterSpacing: '0.1em' }}>
    Carte indisponible
  </div>
) })))

/**
 * Découvrir — les lignes du jour.
 *
 * Trois façons de lire, au choix : la liste, qui laisse revenir en
 * arrière et ouvrir les profils ; la pile, qui impose un rythme et
 * tranche carte après carte ; la carte, qui situe les lignes du jour
 * autour de soi. La liste est le mode par défaut.
 */
export default function Lire() {
  const navigate = useNavigate()
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const { word } = useDailyWord()
  const { left, connect } = useConnections()

  // la pile d'abord : swiper sur les phrases plutot que sur les visages
  // est le geste central du site, il ne se cache pas derriere une bascule
  const [mode,    setMode]    = useState('pile')    // 'pile' | 'liste' | 'carte'
  const [maPosition, setMaPosition] = useState(null)
  const [choisi,  setChoisi]  = useState(null)
  const [entries, setEntries] = useState([])
  const [passed,  setPassed]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (demoMode) {
          if (alive) setEntries(DEMO_READING)
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

  useEffect(() => {
    if (demoMode || !profile?.id) return
    let alive = true
    supabase.rpc('get_my_location').then(({ data }) => {
      if (alive && data?.[0]) setMaPosition(data[0])
    })
    return () => { alive = false }
  }, [profile?.id, demoMode])

  // Deux usages du meme jeu de donnees. La liste et la carte montrent
  // tout : relire quelqu'un qu'on connait deja garde du sens. La pile,
  // elle, ne montre que ce qui reste a trancher — reproposer une carte
  // deja tranchee, c'est faire refaire le meme geste pour rien.
  const aLire = entries
  const aTrancher = entries.filter(e =>
    !e.deja_connecte && !e.passe && !passed.includes(e.user_id)
  )

  // SwipeStack attend des items porteurs d'un `id` : c'est celui de
  // l'auteur, puisque c'est lui qu'on connecte. Le mot est recopié dans
  // chaque carte, toutes les lignes du jour répondant au même.
  const cartes = aTrancher.map(e => ({
    id: e.user_id, pseudo: e.display_name, line: e.line, word: word?.word,
    compatibility: e.compatibility,
  }))

  return (
    <div className="pb-nav" style={{ minHeight: '100dvh', background: 'var(--encre)', color: 'var(--ivoire)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', maxWidth: 640, margin: '0 auto', padding: '26px clamp(18px, 5vw, 32px) 0' }}>

        <div className="flex items-start justify-between" style={{ gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.65)' }}>
              Aujourd’hui
            </p>
            <h1 style={{
              fontFamily: 'Cormorant, serif', fontWeight: 500,
              fontSize: 'clamp(1.8rem, 7vw, 2.6rem)', lineHeight: 1.1, marginTop: 8,
            }}>
              Ce qu’ils ont écrit
            </h1>
          </div>

          {/* bascule liste / pile */}
          <div className="flex" style={{ border: '1px solid rgba(242,238,230,0.16)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
            {[
              { id: 'pile',  Icon: Layers2,    aria: 'Lire en pile'  },
              { id: 'liste', Icon: LayoutList, aria: 'Lire en liste' },
              { id: 'carte', Icon: MapIcon,    aria: 'Lire sur la carte' },
            ].map(({ id, Icon, aria }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                aria-pressed={mode === id}
                aria-label={aria}
                style={{
                  padding: '8px 11px', cursor: 'pointer', border: 'none',
                  background: mode === id ? 'var(--or)' : 'transparent',
                  color: mode === id ? 'var(--encre)' : 'rgba(242,238,230,0.6)',
                  transition: 'all var(--dur-mid) var(--ease-out)',
                }}
              >
                <Icon size={15} strokeWidth={mode === id ? 2 : 1.5} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center" style={{ padding: '70px 0' }} role="status" aria-label="Chargement…">
          <div className="w-7 h-7 rounded-full animate-spin"
               style={{ border: '2px solid rgba(201,168,76,0.22)', borderTopColor: 'var(--or)' }} />
        </div>
      ) : (mode === 'pile' ? aTrancher : aLire).length === 0 ? (
        <RienALire vide={entries.length === 0} onWrite={() => navigate('/mot-du-jour')} onListe={() => { setPassed([]); setMode('liste') }} />
      ) : mode === 'pile' ? (
        <Suspense fallback={<div style={{ flex: 1 }} />}>
          <SwipeStack
            variant="word"
            profiles={cartes}
            counterLabel={`${left} connexion${left > 1 ? 's' : ''} sur ${DAILY_CONNECTION_QUOTA} aujourd’hui`}
            onLike={async userId => {
              const ok = await connect(userId)
              if (ok) toast('Demande de connexion envoyée ✓')
              setPassed(p => p.includes(userId) ? p : [...p, userId])
            }}
            onPass={userId => {
              setPassed(p => p.includes(userId) ? p : [...p, userId])
              // enregistre pour que la ligne ne revienne pas au prochain
              // chargement ; la mise de cote s'efface avec le mot du jour
              if (!demoMode) supabase.rpc('passer_ligne', { p_other: userId })
            }}
          />
        </Suspense>
      ) : mode === 'carte' ? (
        <div style={{ flex: 1, position: 'relative', marginTop: 20, minHeight: 380 }}>
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center"
                 style={{ color: 'var(--or)', fontSize: 13, letterSpacing: '0.1em' }}>
              Chargement de la carte…
            </div>
          }>
            <MapView profiles={aLire} onSelect={setChoisi} myProfile={maPosition} />
          </Suspense>

          {choisi && (
            <div className="animate-fade-in-up" style={{
              position: 'absolute', left: 16, right: 16, bottom: 16,
              maxWidth: 420, margin: '0 auto', zIndex: 1000, animationFillMode: 'both',
            }}>
              <article className="paper" style={{ padding: '18px 20px', cursor: 'pointer' }}
                       onClick={() => navigate(`/personne/${choisi.user_id}`)}>
                <header className="flex items-baseline justify-between" style={{ gap: 12 }}>
                  <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.35rem', fontWeight: 600, lineHeight: 1 }}>
                    {choisi.display_name}
                  </h2>
                  <span style={{ fontSize: 11, color: 'rgba(11,11,11,0.45)', whiteSpace: 'nowrap' }}>
                    {[formatIdentity(choisi), choisi.distance_km != null ? `${choisi.distance_km} km` : null]
                      .filter(Boolean).join(' · ')}
                  </span>
                </header>
                <Taux valeur={choisi.compatibility} />
                <p style={{
                  fontFamily: 'Cormorant, serif', fontStyle: 'italic',
                  fontSize: '1.05rem', lineHeight: 1.6, margin: '10px 0 12px',
                }}>
                  « {choisi.line} »
                </p>
                <span className="flex items-center justify-end" style={{
                  gap: 7, fontSize: 11, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'rgba(11,11,11,0.5)',
                }}>
                  Lire son profil
                  <ArrowRight size={13} strokeWidth={1.5} />
                </span>
              </article>
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 640, margin: '0 auto', padding: '26px clamp(18px, 5vw, 32px) 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {aLire.map((e, i) => (
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

              <Taux valeur={e.compatibility} />

              <p style={{
                fontFamily: 'Cormorant, serif', fontStyle: 'italic',
                fontSize: '1.15rem', lineHeight: 1.62, margin: '12px 0 16px',
              }}>
                « {e.line} »
              </p>

              <div className="flex items-center justify-between" style={{ gap: 12 }}>
                {/* la liste dit ce qu'on a deja tranche, pour qu'on sache
                    ou on en est sans avoir a s'en souvenir */}
                <span style={{
                  fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: e.deja_connecte ? 'rgba(201,168,76,0.95)' : 'rgba(11,11,11,0.3)',
                }}>
                  {e.deja_connecte ? 'Connecté' : e.passe ? 'Mis de côté' : ''}
                </span>

                <span className="flex items-center" style={{
                  gap: 7, fontSize: 11, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'rgba(11,11,11,0.5)',
                }}>
                  Lire son profil
                  <ArrowRight size={13} strokeWidth={1.5} />
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Le taux de compatibilité intellectuelle.
 *
 * Calculé en base à partir des seize questions : les réponses des
 * autres ne descendent jamais jusqu'ici, seulement le pourcentage.
 */
function Taux({ valeur }) {
  if (valeur == null) return null
  return (
    <div className="flex items-center" style={{ gap: 9, margin: '12px 0 0' }}>
      <div style={{ flex: 1, height: 2, background: 'rgba(11,11,11,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${valeur}%`, height: '100%', background: 'var(--or)' }} />
      </div>
      <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(11,11,11,0.55)', whiteSpace: 'nowrap' }}>
        {valeur} % · {compatibilityLabel(valeur)}
      </span>
    </div>
  )
}

function RienALire({ vide, onWrite, onListe }) {
  return (
    <div style={{ textAlign: 'center', padding: '54px 28px' }}>
      <Quill size={44} tone="or" style={{ marginBottom: 22 }} />
      <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', lineHeight: 1.45 }}>
        {vide ? 'Rien à lire pour l’instant.' : 'Vous avez tout lu aujourd’hui.'}
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.75, color: 'rgba(242,238,230,0.5)', marginTop: 10 }}>
        {vide
          ? 'Écrivez votre ligne du jour — les autres s’ouvriront ensuite.'
          : 'Un nouveau mot demain, de nouvelles lignes.'}
      </p>
      <button onClick={vide ? onWrite : onListe} className="btn btn-continuer" style={{ marginTop: 26 }}>
        {vide ? 'Écrire ma ligne' : 'Tout relire'}
      </button>
    </div>
  )
}
