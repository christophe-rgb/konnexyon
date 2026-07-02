import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, Compass, Zap, Layers2, LayoutGrid, Map, Bookmark, MapPin, Check, Unlink } from 'lucide-react'
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
import { confirm } from '../components/ConfirmDialog'
import XLogo from '../components/XLogo'

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
  const [venues,     setVenues]     = useState([])
  const [showFreeBanner, setShowFreeBanner] = useState(true)
  const [gridFilter,  setGridFilter]  = useState('all') // 'all' | 'connected' | 'discover'

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

  // synchronise la distance avec max_distance_km du profil dès qu'il est chargé.
  // NB: 0 = « peu importe » (rayon illimité) — il faut le propager, donc on teste
  // != null et pas la simple véracité (0 est falsy et était ignoré avant).
  useEffect(() => {
    if (profile && profile.max_distance_km != null) {
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

  // Lieux partenaires pour le calque carte (chargés une seule fois).
  useEffect(() => {
    if (demoMode) return
    let isMounted = true
    supabase.rpc('get_venues').then(({ data, error }) => {
      if (error) { console.error('get_venues:', error.message); return }
      if (isMounted) setVenues(data || [])
    })
    return () => { isMounted = false }
  }, [demoMode])

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

  // Déconnexion réelle d'un couple : retire les likes réciproques, le match et
  // la conversation (RPC disconnect_couple). Réservé aux couples connectés.
  const disconnect = async (p) => {
    const ok = await confirm({
      title: 'Déconnecter',
      message: 'Se déconnecter de ce couple ? La connexion et la conversation seront supprimées.',
      confirmLabel: 'Déconnecter',
      danger: true,
    })
    if (!ok) return
    if (!demoMode) {
      const { error } = await supabase.rpc('disconnect_couple', { p_other_id: p.id })
      if (error) { toast('Impossible de déconnecter — ' + (error.message || 'réessayez'), 'error'); return }
    }
    // retire de la session courante + du panier
    setLikedIds(prev => { const n = new Set(prev); n.delete(p.id); return n })
    setPassed(prev => prev.filter(x => x.id !== p.id))
    // repasse le drapeau local à false (fallback demo) puis recharge la liste
    setProfiles(ps => ps.map(x => x.id === p.id ? { ...x, liked: false } : x))
    if (!demoMode) await load()
    toast('Déconnecté')
  }

  // Grille : tous les couples (connectés + à découvrir) avec le drapeau `liked`
  // recalculé, filtrés par le segment gridFilter.
  const gridProfiles = useMemo(() => {
    if (gridFilter === 'connected') return mapProfiles.filter(p => p.liked)
    if (gridFilter === 'discover')  return mapProfiles.filter(p => !p.liked)
    return mapProfiles
  }, [mapProfiles, gridFilter])

  return (
    <div className="h-dvh flex flex-col pb-nav">

      {/* ── toolbar ── */}
      <header
        className="flex items-center justify-between px-4 py-3 animate-fade-in"
        style={{
          background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.28)',
          boxShadow: '0 6px 22px rgba(0,0,0,0.28)',
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
            <MapView profiles={mapProfiles} onSelect={setSelected} myProfile={myMapPos} venues={venues} />
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
          {/* segment de filtre : Tous · Connectés · À découvrir */}
          {(() => {
            const connectedCount = mapProfiles.filter(p => p.liked).length
            const discoverCount  = mapProfiles.length - connectedCount
            const segments = [
              { id: 'all',       label: 'Tous',        count: mapProfiles.length },
              { id: 'connected', label: 'Connectés',   count: connectedCount },
              { id: 'discover',  label: 'À découvrir',  count: discoverCount },
            ]
            return (
              <div className="flex rounded-full mx-auto mb-4 animate-fade-in" style={{
                maxWidth: 420,
                padding: 4, gap: 4,
                border: '1px solid rgba(201,168,76,0.22)',
                background: 'rgba(255,255,255,0.05)',
                animationFillMode: 'both',
              }}>
                {segments.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setGridFilter(s.id)}
                    aria-pressed={gridFilter === s.id}
                    className="erb-btn flex-1 cursor-pointer"
                    style={{
                      padding: '7px 6px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      background: gridFilter === s.id
                        ? 'linear-gradient(135deg, #B8891F, #F4D875, #B8891F)'
                        : 'transparent',
                      color: gridFilter === s.id ? '#050505' : 'rgba(240,237,232,0.6)',
                    }}
                  >
                    {s.label}
                    <span style={{ opacity: 0.75, marginLeft: 5 }}>{s.count}</span>
                  </button>
                ))}
              </div>
            )
          })()}

          {gridProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-16 animate-fade-in" style={{ animationFillMode: 'both' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'radial-gradient(circle, rgba(201,168,76,0.1), transparent)',
                border: '1px solid rgba(201,168,76,0.25)',
              }}>
                <Compass size={24} strokeWidth={1} style={{ color: 'rgba(201,168,76,1)' }} />
              </div>
              <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.35rem', color: 'rgba(28,24,20,1)' }}>
                {gridFilter === 'connected' ? 'Aucun couple connecté' : gridFilter === 'discover' ? 'Aucun couple à découvrir' : 'Aucun couple à proximité'}
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.7)', lineHeight: 1.6 }}>
                {gridFilter === 'connected'
                  ? 'Connectez-vous avec des couples pour les retrouver ici.'
                  : 'Élargissez la distance ou modifiez vos filtres.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gridProfiles.map((p, i) => (
                <GridCard
                  key={p.id}
                  profile={p}
                  index={i}
                  onOpen={() => navigate('/profile/' + p.id)}
                  onConnect={() => like(p.id)}
                  onDisconnect={() => disconnect(p)}
                />
              ))}
            </div>
          )}
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

// Carte de grille dédiée à la vue « Explorer » : montre un couple (connecté ou
// non), permet de visiter le profil (clic sur la photo/nom) et de se connecter
// ou se déconnecter via les boutons dédiés.
function GridCard({ profile, index = 0, onOpen, onConnect, onDisconnect }) {
  const coupleName = profile.couple_name ?? 'Couple'
  const connected  = !!profile.liked
  const [hovered, setHovered] = useState(false)
  const [busy,    setBusy]    = useState(false)

  const handleConnect = async e => {
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try { await onConnect?.() } finally { setBusy(false) }
  }
  const handleDisconnect = async e => {
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try { await onDisconnect?.() } finally { setBusy(false) }
  }

  return (
    <div
      className="animate-fade-in-up"
      role="article"
      aria-label={`Couple ${coupleName}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '18px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #FDFAF6 0%, #F5F0E8 100%)',
        boxShadow: hovered
          ? '0 16px 44px rgba(0,0,0,0.28), 0 0 0 1px rgba(201,168,76,0.4)'
          : '0 4px 18px rgba(0,0,0,0.12), 0 0 0 1px rgba(201,168,76,0.15)',
        transition: 'box-shadow 0.35s, transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        animationDelay: `${index * 70}ms`,
        animationFillMode: 'both',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── zone photo/nom (clic → profil) ── */}
      <button
        onClick={onOpen}
        aria-label={`Voir le profil de ${coupleName}`}
        className="erb-btn"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/3',
          overflow: 'hidden',
          cursor: 'pointer',
          padding: 0, border: 'none', background: 'transparent',
          display: 'block',
        }}
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={`Photo de ${coupleName}`}
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{ transition: 'transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94)', transform: hovered ? 'scale(1.06)' : 'scale(1)' }}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #F0EBE2 0%, #EDE7DB 100%)' }}>
            <span style={{
              fontFamily: 'Cormorant, serif', fontSize: '58px', fontWeight: 300, lineHeight: 1,
              background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', opacity: 0.55,
            }}>
              {coupleName[0]}
            </span>
          </div>
        )}

        {/* dégradé bas pour lisibilité du nom */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 40%, transparent 70%)' }} />

        {/* badge état connecté */}
        {connected && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full" style={{
            background: 'linear-gradient(135deg, #A07830, #E8CC7A)',
            boxShadow: '0 2px 10px rgba(201,168,76,0.35)',
          }}>
            <Check size={11} strokeWidth={3} color="#050505" />
            <span style={{ fontSize: '10px', color: '#050505', fontWeight: 700, letterSpacing: '0.06em' }}>CONNECTÉ</span>
          </div>
        )}

        {/* badge distance */}
        {profile.distance_km != null && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
            background: 'rgba(245,240,232,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(28,24,20,0.15)',
          }}>
            <MapPin size={9} strokeWidth={2} style={{ color: 'rgba(201,168,76,1)' }} />
            <span style={{ fontSize: '10px', color: 'rgba(28,24,20,0.9)', fontWeight: 500 }}>{profile.distance_km} km</span>
          </div>
        )}

        {/* nom + orientation */}
        <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
          <h3 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.3rem', fontWeight: 600, color: '#fff', lineHeight: 1.1, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
            {coupleName}
          </h3>
          {profile.orientation && (
            <p style={{ fontSize: '9.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(232,204,122,1)', marginTop: 3 }}>
              {profile.orientation.replace('_', ' · ')}
            </p>
          )}
        </div>
      </button>

      {/* ── zone action ── */}
      <div className="p-3">
        {connected ? (
          <button
            onClick={handleDisconnect}
            disabled={busy}
            aria-label={`Se déconnecter de ${coupleName}`}
            className="erb-btn w-full flex items-center justify-center gap-2"
            style={{
              minHeight: '42px', borderRadius: '12px',
              background: 'rgba(220,50,50,0.1)',
              border: '1px solid rgba(220,50,50,0.4)',
              color: 'rgba(200,40,40,1)',
              fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600,
              cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, transition: 'all 0.2s',
            }}
          >
            <Unlink size={14} strokeWidth={2} />
            Déconnecter
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={busy}
            aria-label={`Se connecter avec ${coupleName}`}
            className="btn-gold w-full flex items-center justify-center gap-2"
            style={{
              minHeight: '42px', borderRadius: '12px', border: 'none',
              fontSize: '12px', letterSpacing: '0.08em', fontWeight: 600,
              cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? (
              <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#050505', borderRadius: '50%', display: 'inline-block', animation: 'rotateX 0.7s linear infinite' }} />
            ) : (
              <>
                <XLogo size={18} />
                Se connecter
              </>
            )}
          </button>
        )}
      </div>
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
