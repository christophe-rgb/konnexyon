import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { SlidersHorizontal, Compass } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { DEMO_PROFILES } from '../lib/demo'
import ProfileCard from '../components/ProfileCard'
import { ProfileCardSkeleton } from '../components/Skeleton'
import FilterPanel from '../components/FilterPanel'
import { toast } from '../components/Toast'

const MapView = lazy(() => import('../components/MapView'))

export default function Discover() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const [view,       setView]       = useState('list')
  const [profiles,   setProfiles]   = useState([])
  const [selected,   setSelected]   = useState(null)
  const [showFilters,setShowFilters] = useState(false)
  const [filters,    setFilters]    = useState({ orientation: 'all', seeking: [], distance: profile?.max_distance_km || 50 })
  const [loading,    setLoading]    = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    if (demoMode) {
      let results = [...DEMO_PROFILES]
      if (filters.orientation !== 'all') results = results.filter(p => p.orientation === filters.orientation)
      if (filters.seeking?.length > 0)   results = results.filter(p => filters.seeking.some(s => p.seeking?.includes(s)))
      if (filters.distance > 0)          results = results.filter(p => p.distance_km <= filters.distance)
      setProfiles(results)
      setLoading(false)
      return
    }
    const radius = filters.distance || 500
    const { data } = await supabase.rpc('get_nearby_compatible_profiles', { radius_km: radius })
    let results = data || []
    if (filters.orientation !== 'all') results = results.filter(p => p.orientation === filters.orientation)
    if (filters.seeking?.length > 0)   results = results.filter(p => filters.seeking.some(s => p.seeking?.includes(s)))
    setProfiles(results)
    setLoading(false)
  }, [filters, demoMode])

  useEffect(() => { load() }, [load])

  const like = async (toId) => {
    if (!demoMode) {
      const { error } = await supabase.from('likes').insert({ from_id: profile.id, to_id: toId })
      if (error) { toast('Erreur lors de la connexion', 'error'); return }
    }
    setProfiles(ps => ps.filter(p => p.id !== toId))
    setSelected(null)
    toast('Demande de connexion envoyée ✓')
  }

  return (
    <div className="h-dvh flex flex-col pb-nav">

      {/* ── toolbar ── */}
      <header
        className="flex items-center justify-between px-4 py-3 animate-fade-in"
        style={{
          background: 'rgba(5,5,5,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(201,168,76,0.1)',
          animationFillMode: 'both',
        }}
      >
        {/* logo compact */}
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 30, height: 30, borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(201,168,76,0.12), rgba(201,168,76,0.04))',
            border: '1px solid rgba(201,168,76,0.25)',
            boxShadow: '0 0 16px rgba(201,168,76,0.1)',
          }}>
            <span style={{
              fontSize: '15px',
              background: 'linear-gradient(135deg,#A07830,#E8CC7A)',
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
            background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A, #C9A84C)',
            backgroundSize: '200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Konnexyon
          </span>
        </div>

        {/* actions toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(true)}
            aria-label="Filtres de connexion"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 cursor-pointer"
            style={{
              background: 'rgba(20,20,20,0.9)',
              border: '1px solid rgba(201,168,76,0.2)',
              color: 'rgba(201,168,76,0.65)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)'; e.currentTarget.style.color = '#C9A84C'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'; e.currentTarget.style.color = 'rgba(201,168,76,0.65)'; }}
          >
            <SlidersHorizontal size={14} strokeWidth={1.5} />
            Filtres
          </button>

          {/* toggle map/list */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(20,20,20,0.9)' }}>
            {[
              { id: 'list', label: '⊞' },
              { id: 'map',  label: '◎' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                aria-pressed={view === id}
                aria-label={id === 'list' ? 'Vue liste' : 'Vue carte'}
                className="px-3 py-1.5 text-sm transition-all duration-200 cursor-pointer"
                style={{
                  background: view === id
                    ? 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)'
                    : 'transparent',
                  color: view === id ? '#050505' : 'rgba(201,168,76,0.5)',
                  fontWeight: view === id ? 700 : 400,
                  fontSize: '13px',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── content ── */}
      {loading ? (
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <ProfileCardSkeleton key={i} />)}
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState />
      ) : view === 'map' ? (
        <div className="flex-1 relative">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(201,168,76,0.4)', fontSize: '13px', letterSpacing: '0.1em' }}>
              Chargement de la carte…
            </div>
          }>
            <MapView profiles={profiles} onSelect={setSelected} />
          </Suspense>
          {selected && (
            <div className="absolute bottom-4 left-4 right-4 max-w-sm mx-auto z-[1000] animate-fade-in-up" style={{ animationFillMode: 'both' }}>
              <ProfileCard profile={selected} onLike={like} onPass={() => setSelected(null)} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {/* compteur */}
          <p className="text-center mb-4 animate-fade-in" style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(201,168,76,0.35)', textTransform: 'uppercase', animationFillMode: 'both' }}>
            {profiles.length} connexion{profiles.length > 1 ? 's' : ''} à proximité
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profiles.map((p, i) => (
              <ProfileCard key={p.id} profile={p} onLike={like} index={i} />
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
        background: 'radial-gradient(circle, rgba(201,168,76,0.08), transparent)',
        border: '1px solid rgba(201,168,76,0.15)',
      }}>
        <Compass size={28} strokeWidth={1} style={{ color: 'rgba(201,168,76,0.4)' }} />
      </div>
      <div>
        <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
          Aucune connexion à proximité
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
          Élargissez la distance ou modifiez vos filtres<br/>pour découvrir de nouveaux couples connectés.
        </p>
      </div>
      <div style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(201,168,76,0.3)', textTransform: 'uppercase' }}>
        ∞ · Libertins par choix · Connectés par désir · ∞
      </div>
    </div>
  )
}
