import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, Compass, Zap, Layers2, LayoutGrid, Map, Bookmark } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { isPremium } from '../lib/plan'
import UpgradeModal from '../components/UpgradeModal'
import { DEMO_PROFILES } from '../lib/demo'
import ProfileCard from '../components/ProfileCard'
const SwipeStack = lazy(() => import('../components/SwipeStack'))
import PanierSheet from '../components/PanierSheet'
import { ProfileCardSkeleton } from '../components/Skeleton'
import FilterPanel from '../components/FilterPanel'
import { toast } from '../components/Toast'

const MapView = lazy(() => import('../components/MapView').catch(() => ({ default: () => (
  <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(201,168,76,1)', fontSize: '13px', letterSpacing: '0.1em' }}>
    Carte indisponible
  </div>
) })))

export default function Discover() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [view,       setView]       = useState(() => searchParams.get('view') || 'swipe')
  const [profiles,   setProfiles]   = useState([])
  const [passed,     setPassed]     = useState([])
  const [selected,   setSelected]   = useState(null)
  const [showFilters,setShowFilters] = useState(false)
  const [showPanier,  setShowPanier]  = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const premium = isPremium(profile)
  const [filters,    setFilters]    = useState({ orientation: 'all', seeking: [], distance: 50 })
  const [loading,    setLoading]    = useState(true)
  const [likedIds,   setLikedIds]   = useState(new Set())
  const [myMapPos,   setMyMapPos]   = useState(null)
  const [showFreeBanner, setShowFreeBanner] = useState(true)

  // Carte : on garde TOUS les couples, y compris ceux déjà contactés (marqués
  // `liked` → marqueur vert + ✓). Le drapeau vient du RPC, ou de likedIds pour
  // les likes faits dans la session courante (avant rechargement).
  const mapProfiles = useMemo(
    () => profiles.map(p => ({ ...p, liked: p.liked || likedIds.has(p.id) })),
    [profiles, likedIds]
  )
  // Pile de swipe : on retire les couples déjà contactés (pas de re-swipe)
  const swipeProfiles = useMemo(
    () => profiles.filter(p => !(p.liked || likedIds.has(p.id))),
    [profiles, likedIds]
  )

  // synchronise la distance avec max_distance_km du profil dès qu'il est chargé
  useEffect(() => {
    if (profile?.max_distance_km) {
      setFilters(f => ({ ...f, distance: profile.max_distance_km }))
    }
  }, [profile?.max_distance_km])

  // récupère la position GPS du profil connecté pour la carte
  useEffect(() => {
    if (demoMode || !profile) return
    let isMounted = true
    supabase.rpc('get_my_location').then(({ data }) => {
      if (data?.[0] && isMounted) setMyMapPos(data[0])
    })
    return () => { isMounted = false }
  }, [profile, demoMode])

  // synchronise view avec le paramètre URL quand on navigue entre onglets
  useEffect(() => {
    const urlView = searchParams.get('view')
    if (urlView) setView(urlView)
  }, [searchParams])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (demoMode) {
        let results = [...DEMO_PROFILES]
        // L'orientation est filtrée par compatibilité côté serveur (RPC) ; un
        // filtre d'égalité stricte ici viderait la liste à tort.
        if (filters.seeking?.length > 0)   results = results.filter(p => filters.seeking.some(s => p.seeking?.includes(s)))
        if (filters.distance > 0)          results = results.filter(p => p.distance_km <= filters.distance)
        setProfiles(results)
        return
      }
      // "Peu importe" (0) = rayon très large, pas 500 km
      const radius = filters.distance > 0 ? filters.distance : 20000
      const { data, error } = await supabase.rpc('get_nearby_compatible_profiles', { radius_km: radius })
      if (error) {
        console.error('RPC error:', error)
        toast('Impossible de charger les profils — ' + (error.message || 'réessayez'), 'error')
        return
      }
      let results = data || []
      if (filters.seeking?.length > 0)   results = results.filter(p => filters.seeking.some(s => p.seeking?.includes(s)))
      setProfiles(results)
    } finally {
      setLoading(false)
    }
  }, [filters, demoMode])

  useEffect(() => { load() }, [load])

  const like = async (toId) => {
    // guard : carte hors borne / id manquant → ne rien insérer (évite to_id NULL)
    if (!toId) return
    // guard anti-auto-swipe : ne jamais liker son propre profil
    if (!demoMode && profile?.id && toId === profile.id) {
      console.warn('[like] auto-swipe bloqué (toId === profile.id)')
      return
    }
    setLikedIds(prev => new Set([...prev, toId]))
    setSelected(null)
    if (!demoMode) {
      const { error } = await supabase.from('likes').insert({ from_id: profile.id, to_id: toId })
      // 23505 = duplicate key (déjà liké) → pas une vraie erreur
      if (error && error.code !== '23505') { toast(`Erreur ${error.code}: ${error.message}`, 'error'); return }
    }
    // ajoute au panier avec flag liked pour suivi visuel
    const p = profiles.find(x => x.id === toId)
    if (p) setPassed(prev => prev.find(x => x.id === toId) ? prev : [...prev, { ...p, liked: true }])
    toast('Demande de connexion envoyée ✓')
  }

  return (
    <div className="h-dvh flex flex-col pb-nav">

      {/* ── toolbar ── */}
      <header
        className="flex items-center justify-between px-4 py-3 animate-fade-in"
        style={{
          background: 'rgba(5,5,5,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(212,175,55,0.22)',
          animationFillMode: 'both',
        }}
      >
        {/* logo compact */}
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 30, height: 30, borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(201,168,76,0.1), rgba(201,168,76,0.1))',
            border: '1px solid rgba(201,168,76,0.3)',
            boxShadow: '0 0 12px rgba(201,168,76,0.25)',
          }}>
            <span style={{
              fontSize: '15px',
              background: 'linear-gradient(135deg, #B8891F, #F4D875, #B8891F)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>∞</span>
          </div>
          <span style={{
            fontFamily: 'Cormorant, serif',
            fontWeight: 600,
            fontSize: '1.25rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #B8891F, #F4D875, #B8891F, #F4D875)',
            backgroundSize: '200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Konnexyon
          </span>
        </div>

        {/* bouton votre couple */}
        <button
          onClick={() => navigate('/profile')}
          className="erb-btn flex items-center gap-2"
          style={{
            background: 'rgba(201,168,76,0.06)',
            border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: '999px',
            padding: '5px 12px 5px 6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.background = 'rgba(201,168,76,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; }}
        >
          {/* mini avatar */}
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            overflow: 'hidden',
            border: '1px solid rgba(201,168,76,0.25)',
            background: '#F0EBE2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 11, color: 'rgba(201,168,76,1)', fontFamily: 'Cormorant, serif' }}>
                {profile?.couple_name?.[0] || '∞'}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'rgba(201,168,76,1)', fontWeight: 500, whiteSpace: 'nowrap',
          }}>
            Votre couple
          </span>
        </button>

        {/* actions toolbar */}
        <div className="flex items-center gap-2">
          {/* panier : profils mis de côté */}
          {passed.length > 0 && (
            <button
              onClick={() => setShowPanier(true)}
              aria-label="Profils mis de côté"
              className="erb-btn flex items-center px-2.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(212,175,55,0.3)',
                color: 'rgba(212,175,55,1)',
                position: 'relative',
              }}
            >
              <Bookmark size={14} strokeWidth={1.5} />
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px',
                minWidth: '16px', height: '16px', borderRadius: '999px',
                background: 'linear-gradient(135deg, #A07830, #C9A84C)',
                color: '#fff', fontSize: '10px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', lineHeight: 1,
              }}>
                {passed.length}
              </span>
            </button>
          )}
          {(() => {
            const activeCount = (filters.orientation !== 'all' ? 1 : 0) + (filters.seeking?.length || 0) + (filters.distance > 0 ? 1 : 0)
            return (
              <button
                onClick={() => setShowFilters(true)}
                aria-label="Filtres de connexion"
                className="erb-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 cursor-pointer"
                style={{
                  background: activeCount > 0 ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.06)',
                  border: activeCount > 0 ? '1px solid rgba(212,175,55,0.55)' : '1px solid rgba(212,175,55,0.3)',
                  color: 'rgba(212,175,55,1)',
                  position: 'relative',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.6)'; e.currentTarget.style.color = '#F2D36B'; e.currentTarget.style.background = 'rgba(212,175,55,0.14)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = activeCount > 0 ? 'rgba(212,175,55,0.55)' : 'rgba(212,175,55,0.3)'; e.currentTarget.style.color = 'rgba(212,175,55,1)'; e.currentTarget.style.background = activeCount > 0 ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.06)'; }}
              >
                <SlidersHorizontal size={14} strokeWidth={1.5} />
                Filtres
                {activeCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-6px', right: '-6px',
                    minWidth: '16px', height: '16px', borderRadius: '999px',
                    background: 'linear-gradient(135deg, #A07830, #C9A84C)',
                    color: '#fff', fontSize: '10px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', lineHeight: 1,
                  }}>
                    {activeCount}
                  </span>
                )}
              </button>
            )
          })()}

          {/* toggle swipe/grille/carte */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(212,175,55,0.22)', background: 'rgba(255,255,255,0.06)' }}>
            {[
              { id: 'swipe', Icon: Layers2,    aria: 'Mode swipe' },
              { id: 'list',  Icon: LayoutGrid, aria: 'Vue grille' },
              { id: 'map',   Icon: Map,        aria: 'Vue carte'  },
            ].map(({ id, Icon, aria }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                aria-pressed={view === id}
                aria-label={aria}
                className="erb-btn px-3 py-2 transition-all duration-200 cursor-pointer"
                style={{
                  background: view === id
                    ? 'linear-gradient(135deg, #B8891F, #F4D875, #B8891F)'
                    : 'transparent',
                  color: view === id ? '#050505' : 'rgba(240,237,232,0.6)',
                }}
              >
                <Icon size={15} strokeWidth={view === id ? 2 : 1.5} />
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── bannière : 100% gratuit ── */}
      {showFreeBanner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: 'linear-gradient(90deg, rgba(74,222,128,0.18), rgba(201,168,76,0.18))',
          borderBottom: '1px solid rgba(74,222,128,0.3)',
        }}>
          <span style={{ fontSize: 15 }} aria-hidden>🎉</span>
          <p style={{ flex: 1, fontSize: 12, color: '#1C1814', letterSpacing: '0.02em' }}>
            <strong style={{ color: '#1C1814' }}>Konnexyon est 100% gratuit</strong>{' '}— likez, matchez et discutez sans aucune limite ✨
          </p>
          <button
            onClick={() => setShowFreeBanner(false)}
            aria-label="Fermer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(28,24,20,0.5)', fontSize: 16, lineHeight: 1, padding: 2 }}
          >×</button>
        </div>
      )}

      {/* ── content ── */}
      {loading ? (
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <ProfileCardSkeleton key={i} />)}
        </div>
      ) : view === 'map' ? (
        <div className="flex-1 relative">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(201,168,76,1)', fontSize: '13px', letterSpacing: '0.1em' }}>
              Chargement de la carte…
            </div>
          }>
            <MapView profiles={mapProfiles} onSelect={setSelected} myProfile={myMapPos} />
          </Suspense>
          {selected && (
            <div className="absolute bottom-4 left-4 right-4 max-w-sm mx-auto z-[1000] animate-fade-in-up" style={{ animationFillMode: 'both' }}>
              <ProfileCard profile={selected} onLike={like} onPass={() => setSelected(null)} />
            </div>
          )}
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState />
      ) : view === 'swipe' ? (
        <Suspense fallback={<ProfileCardSkeleton />}>
          <SwipeStack
            profiles={swipeProfiles}
            onLike={like}
            onPass={id => {
              setProfiles(ps => {
                const p = ps.find(x => x.id === id)
                if (!p) return ps
                setPassed(prev => prev.find(x => x.id === id) ? prev : [...prev, p])
                return [...ps.filter(x => x.id !== id), p]
              })
              toast('Reproposé plus tard')
            }}
          />
        </Suspense>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {/* compteur */}
          <p className="text-center mb-4 animate-fade-in" style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(201,168,76,1)', textTransform: 'uppercase', animationFillMode: 'both' }}>
            {profiles.length} connexion{profiles.length > 1 ? 's' : ''} à proximité
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profiles.map((p, i) => (
              <ProfileCard
                key={p.id} profile={p} index={i}
                isLiked={likedIds.has(p.id)}
                onLike={likedIds.has(p.id) ? null : like}
                onPass={likedIds.has(p.id) ? null : id => setProfiles(ps => ps.filter(x => x.id !== id))}
              />
            ))}
          </div>
        </div>
      )}

      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={f => { setFilters(f); setShowFilters(false) }}
          onClose={() => setShowFilters(false)}
        />
      )}


      {showPanier && (
        <PanierSheet
          profiles={passed}
          onLike={id => {
            like(id)
            setPassed(ps => ps.filter(p => p.id !== id))
          }}
          onRemove={id => setPassed(ps => ps.filter(p => p.id !== id))}
          onClose={() => setShowPanier(false)}
        />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-5 animate-fade-in" style={{ animationFillMode: 'both' }}>
      {/* icône ornementale */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle, rgba(201,168,76,0.1), transparent)',
        border: '1px solid rgba(201,168,76,0.25)',
      }}>
        <Compass size={28} strokeWidth={1} style={{ color: 'rgba(201,168,76,1)' }} />
      </div>
      <div>
        <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', color: 'rgba(28,24,20,1)', marginBottom: '8px' }}>
          Aucune connexion à proximité
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.7)', lineHeight: 1.6 }}>
          Élargissez la distance ou modifiez vos filtres<br/>pour découvrir de nouveaux couples connectés.
        </p>
      </div>
      <div style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(201,168,76,1)', textTransform: 'uppercase' }}>
        ∞ · Libertins par choix · Connectés par désir · ∞
      </div>
    </div>
  )
}
