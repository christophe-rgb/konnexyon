import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal, Compass, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { isPremium } from '../lib/plan'
import UpgradeModal from '../components/UpgradeModal'
import { DEMO_PROFILES } from '../lib/demo'
import ProfileCard from '../components/ProfileCard'
import SwipeStack from '../components/SwipeStack'
import PanierSheet from '../components/PanierSheet'
import { ProfileCardSkeleton } from '../components/Skeleton'
import FilterPanel from '../components/FilterPanel'
import { toast } from '../components/Toast'

const MapView = lazy(() => import('../components/MapView'))

export default function Discover() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const navigate = useNavigate()
  const [view,       setView]       = useState('swipe')
  const [profiles,   setProfiles]   = useState([])
  const [passed,     setPassed]     = useState([])
  const [selected,   setSelected]   = useState(null)
  const [showFilters,setShowFilters] = useState(false)
  const [showPanier,  setShowPanier]  = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const premium = isPremium(profile)
  const [filters,    setFilters]    = useState({ orientation: 'all', seeking: [], distance: profile?.max_distance_km || 50 })
  const [loading,    setLoading]    = useState(true)
  const [likedIds,   setLikedIds]   = useState(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (demoMode) {
        let results = [...DEMO_PROFILES]
        if (filters.orientation !== 'all') results = results.filter(p => p.orientation === filters.orientation)
        if (filters.seeking?.length > 0)   results = results.filter(p => filters.seeking.some(s => p.seeking?.includes(s)))
        if (filters.distance > 0)          results = results.filter(p => p.distance_km <= filters.distance)
        setProfiles(results)
        return
      }
      const radius = filters.distance || 500
      const { data, error } = await supabase.rpc('get_nearby_compatible_profiles', { radius_km: radius })
      if (error) console.error('RPC error:', error)
      let results = data || []
      if (filters.orientation !== 'all') results = results.filter(p => p.orientation === filters.orientation)
      if (filters.seeking?.length > 0)   results = results.filter(p => filters.seeking.some(s => p.seeking?.includes(s)))
      setProfiles(results)
    } finally {
      setLoading(false)
    }
  }, [filters, demoMode])

  useEffect(() => { load() }, [load])

  const like = async (toId) => {
    setLikedIds(prev => new Set([...prev, toId]))
    setSelected(null)
    if (!premium && !demoMode) { setShowUpgrade(true); return }
    if (!demoMode) {
      const { error } = await supabase.from('likes').insert({ from_id: profile.id, to_id: toId })
      if (error) { toast('Erreur lors de la connexion', 'error'); return }
    }
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

        {/* bouton votre couple */}
        <button
          onClick={() => navigate('/profile')}
          className="erb-btn flex items-center gap-2"
          style={{
            background: 'rgba(201,168,76,0.06)',
            border: '1px solid rgba(201,168,76,0.22)',
            borderRadius: '999px',
            padding: '5px 12px 5px 6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.background = 'rgba(201,168,76,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.22)'; e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; }}
        >
          {/* mini avatar */}
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            overflow: 'hidden',
            border: '1px solid rgba(201,168,76,0.35)',
            background: '#111',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 11, color: 'rgba(201,168,76,0.6)', fontFamily: 'Cormorant, serif' }}>
                {profile?.couple_name?.[0] || '∞'}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'rgba(201,168,76,0.75)', fontWeight: 500, whiteSpace: 'nowrap',
          }}>
            Votre couple
          </span>
        </button>

        {/* actions toolbar */}
        <div className="flex items-center gap-2">
          {/* bouton panier */}
          <button
            onClick={() => setShowPanier(true)}
            aria-label="Profils mis de côté"
            className="erb-btn"
            style={{
              position: 'relative',
              width: 36, height: 36, borderRadius: '10px',
              background: 'rgba(20,20,20,0.9)',
              border: `1px solid ${passed.length ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.2)'}`,
              color: passed.length ? '#C9A84C' : 'rgba(201,168,76,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              fontSize: 16,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.55)'; e.currentTarget.style.color = '#C9A84C'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = passed.length ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.2)'; e.currentTarget.style.color = passed.length ? '#C9A84C' : 'rgba(201,168,76,0.4)'; }}
          >
            <Zap size={16} strokeWidth={1.5} />
            {passed.length > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                minWidth: 18, height: 18, borderRadius: 9,
                background: 'linear-gradient(135deg, #A07830, #E8CC7A)',
                color: '#050505', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px',
                boxShadow: '0 0 8px rgba(201,168,76,0.5)',
              }}>{passed.length}</span>
            )}
          </button>

          <button
            onClick={() => setShowFilters(true)}
            aria-label="Filtres de connexion"
            className="erb-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 cursor-pointer"
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

          {/* toggle swipe/grille/carte */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(20,20,20,0.9)' }}>
            {[
              { id: 'swipe', label: '⟺', aria: 'Mode swipe' },
              { id: 'list',  label: '⊞', aria: 'Vue grille' },
              { id: 'map',   label: '◎', aria: 'Vue carte'  },
            ].map(({ id, label, aria }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                aria-pressed={view === id}
                aria-label={aria}
                className="erb-btn px-3 py-1.5 text-sm transition-all duration-200 cursor-pointer"
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
      ) : view === 'swipe' ? (
        <SwipeStack
          profiles={profiles}
          onLike={like}
          onPass={id => {
            setProfiles(ps => {
              const p = ps.find(x => x.id === id)
              if (!p) return ps
              return [...ps.filter(x => x.id !== id), p]
            })
            toast('Reproposé plus tard')
          }}
        />
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

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          message="Passez Premium pour envoyer des connexions et contacter les couples."
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
