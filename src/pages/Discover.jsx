import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { Map, List, SlidersHorizontal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { DEMO_PROFILES } from '../lib/demo'
import ProfileCard   from '../components/ProfileCard'
import { ProfileCardSkeleton } from '../components/Skeleton'
import FilterPanel   from '../components/FilterPanel'
import { toast }     from '../components/Toast'
import clsx from 'clsx'

const MapView = lazy(() => import('../components/MapView'))

export default function Discover() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const [view,    setView]    = useState('list')
  const [profiles, setProfiles] = useState([])
  const [selected, setSelected] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ orientation: 'all', seeking: [], distance: profile?.max_distance_km || 50 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    if (demoMode) {
      let results = [...DEMO_PROFILES]
      if (filters.orientation !== 'all') results = results.filter(p => p.orientation === filters.orientation)
      if (filters.seeking?.length > 0) results = results.filter(p => filters.seeking.some(s => p.seeking?.includes(s)))
      if (filters.distance > 0) results = results.filter(p => p.distance_km <= filters.distance)
      setProfiles(results)
      setLoading(false)
      return
    }

    const radius = filters.distance || 500
    const { data } = await supabase.rpc('get_nearby_compatible_profiles', { radius_km: radius })
    let results = data || []
    if (filters.orientation !== 'all') results = results.filter(p => p.orientation === filters.orientation)
    if (filters.seeking?.length > 0) results = results.filter(p => filters.seeking.some(s => p.seeking?.includes(s)))
    setProfiles(results)
    setLoading(false)
  }, [filters, demoMode])

  useEffect(() => { load() }, [load])

  const like = async (toId) => {
    if (!demoMode) {
      const { error } = await supabase.from('likes').insert({ from_id: profile.id, to_id: toId })
      if (error) { toast('Erreur lors du like', 'error'); return }
    }
    setProfiles(ps => ps.filter(p => p.id !== toId))
    setSelected(null)
    toast('Like envoyé !')
  }

  return (
    <div className="h-dvh flex flex-col pb-nav">
      {/* toolbar */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
        <div className="flex items-center gap-2.5">
          <div style={{ width: 28, height: 28, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <span style={{ fontSize: '14px', background: 'linear-gradient(135deg,#A07830,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>∞</span>
          </div>
          <span style={{ fontFamily: 'Cormorant, serif', fontWeight: 600, fontSize: '1.3rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A, #C9A84C)', backgroundSize: '200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Konnexyon
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface2 border border-[rgba(201,168,76,0.2)] text-muted hover:text-text text-sm transition-colors duration-150 cursor-pointer"
          >
            <SlidersHorizontal size={15} strokeWidth={1.5} />
            Filtres
          </button>

          {/* toggle map/list */}
          <div className="flex bg-surface2 border border-[rgba(201,168,76,0.2)] rounded-lg overflow-hidden">
            {[
              { id: 'map',  icon: Map  },
              { id: 'list', icon: List },
            ].map(({ id, icon: Icon }) => (
              <button key={id} onClick={() => setView(id)}
                className={clsx('p-2 transition-colors duration-150 cursor-pointer',
                  view === id ? 'bg-gold text-bg' : 'text-muted hover:text-text')}>
                <Icon size={16} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* content */}
      {loading ? (
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <ProfileCardSkeleton key={i} />)}
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
          <p className="font-serif text-2xl text-muted">Aucun couple à proximité</p>
          <p className="text-sm text-muted/70">Essayez d'élargir la distance ou de modifier vos filtres.</p>
        </div>
      ) : view === 'map' ? (
        <div className="flex-1 relative">
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-muted text-sm">Chargement de la carte…</div>}>
            <MapView profiles={profiles} onSelect={setSelected} />
          </Suspense>
          {/* card flottante au clic sur un marker */}
          {selected && (
            <div className="absolute bottom-4 left-4 right-4 max-w-sm mx-auto z-[1000]">
              <ProfileCard profile={selected} onLike={like} onPass={() => setSelected(null)} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profiles.map(p => (
            <ProfileCard key={p.id} profile={p} onLike={like} />
          ))}
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
