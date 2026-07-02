import { useEffect, useState, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { DEMO_MATCHES } from '../lib/demo'
import MatchCard from '../components/MatchCard'
import { MatchCardSkeleton } from '../components/Skeleton'
import { Zap } from 'lucide-react'

const MapView = lazy(() => import('../components/MapView').catch(() => ({ default: () => (
  <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(201,168,76,1)', fontSize: '13px' }}>Carte indisponible</div>
) })))

export default function Matches() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const [searchParams] = useSearchParams()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [view,    setView]    = useState(searchParams.get('view') === 'map' ? 'map' : 'list')
  const [mapProfiles, setMapProfiles] = useState([])

  useEffect(() => {
    if (!profile) return
    if (demoMode) { setMatches(DEMO_MATCHES); setLoading(false); return }
    let isMounted = true

    const load = async () => {
      const { data } = await supabase
        .from('matches')
        .select('id, created_at, couple_a, couple_b')
        .or(`couple_a.eq.${profile.id},couple_b.eq.${profile.id}`)
        .order('created_at', { ascending: false })

      if (!data) { if (isMounted) setLoading(false); return }

      // Batch fetch all profiles in one query instead of N individual selects
      const otherIds = data.map(m => m.couple_a === profile.id ? m.couple_b : m.couple_a)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, couple_name, avatar_url, bio')
        .in('id', otherIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

      const enriched = await Promise.all(data.map(async m => {
        const otherId = m.couple_a === profile.id ? m.couple_b : m.couple_a

        // Dernier message DÉCHIFFRÉ (RPC serveur) ; repli direct si la migration
        // de chiffrement n'est pas encore appliquée.
        let msg = null
        const { data: lm, error: lmErr } = await supabase.rpc('get_last_message', { p_match_id: m.id })
        if (!lmErr) {
          msg = (lm && lm[0]) || null
        } else if (lmErr.code === 'PGRST202') {
          const r = await supabase
            .from('messages')
            .select('content, photo_url, created_at')
            .eq('match_id', m.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          msg = r.data
        }

        return {
          ...m,
          profile: profileMap[otherId] || null,
          lastMessage: msg?.content || (msg?.photo_url ? 'Photo' : null),
        }
      }))

      const filtered = enriched.filter(m => m.profile)
      if (!isMounted) return
      setMatches(filtered)
      setLoading(false)

      // fetch locations for map
      const ids = filtered.map(m => m.profile.id)
      if (ids.length) {
        const { data: locs, error: locErr } = await supabase.rpc('get_match_locations', { profile_ids: ids })
        if (locErr) console.error('get_match_locations:', locErr)
        if (locs && isMounted) setMapProfiles(locs)
      }
    }

    load()

    const channel = supabase
      .channel('matches-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => load())
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [profile?.id, demoMode])

  return (
    <div className="max-w-lg mx-auto px-4 pb-nav" style={{ paddingTop: '0' }}>

      {/* logo en fond, reflet bijou */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="shine-img" style={{ position: 'relative' }}>
          <picture>
            <source srcSet="/logo.webp" type="image/webp" />
            <img src="/logo.webp" alt="" aria-hidden style={{
              width: '135vw', maxWidth: 960, opacity: 0.22,
              filter: 'brightness(1.12) saturate(0.8)', display: 'block', userSelect: 'none',
            }} />
          </picture>
        </div>
        <div style={{ position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(253,250,246,0.12) 0%, rgba(253,250,246,0.55) 55%, rgba(253,250,246,0.9) 100%)' }} />
      </div>

      {/* header — barre sombre pleine largeur, titre centré */}
      <header
        className="sticky top-0 z-10 mb-2 animate-fade-in"
        style={{
          background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.28)',
          boxShadow: '0 6px 22px rgba(0,0,0,0.28)',
          width: '100vw', marginLeft: 'calc(50% - 50vw)',
          position: 'sticky',
          animationFillMode: 'both',
        }}
      >
       <div className="max-w-lg mx-auto flex flex-col items-center justify-center text-center px-5 py-4" style={{ position: 'relative' }}>
        {/* halo doré derrière le titre */}
        <div aria-hidden style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 260, height: 90, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0) 70%)',
        }} />
        {/* accent décoratif centré */}
        <div style={{
          width: 34, height: 34, borderRadius: '11px', marginBottom: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(201,168,76,0.12), rgba(201,168,76,0.04))',
          border: '1px solid rgba(201,168,76,0.28)',
          boxShadow: '0 0 14px rgba(201,168,76,0.18)',
          position: 'relative',
        }}>
          <Zap size={15} strokeWidth={1.5} style={{ color: 'rgba(201,168,76,1)' }} />
        </div>
        <h1 style={{
          fontFamily: 'Cormorant, serif',
          fontSize: '1.9rem',
          fontWeight: 600,
          background: 'linear-gradient(135deg, #B8891F, #F4D875, #B8891F)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '0.03em',
          lineHeight: 1.1,
          position: 'relative',
        }}>
          Vos connexions
        </h1>
        {!loading && matches.length > 0 && (
          <p style={{ fontSize: '11px', color: 'rgba(201,168,76,1)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: '4px', position: 'relative' }}>
            {matches.length} connexion{matches.length > 1 ? 's' : ''} mutuelles
          </p>
        )}
       </div>
      </header>

      {view === 'map' ? (
        <div style={{ height: 'calc(100dvh - 140px)', borderRadius: '16px', overflow: 'hidden', marginTop: '8px' }}>
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(201,168,76,1)', fontSize: '13px' }}>
              Chargement de la carte…
            </div>
          }>
            <MapView profiles={mapProfiles} onSelect={() => {}} />
          </Suspense>
          {mapProfiles.length === 0 && !loading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: 'rgba(201,168,76,1)', fontSize: '13px', pointerEvents: 'none' }}>
              Aucune position disponible
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-3 pt-2">
          {[1,2,3].map(i => <MatchCardSkeleton key={i} />)}
        </div>
      ) : matches.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3 pt-2">
          {matches.map((m, i) => (
            <div
              key={m.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
            >
              <MatchCard match={m} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-10 gap-6 animate-fade-in" style={{ animationFillMode: 'both' }}>
      {/* icône */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle, rgba(201,168,76,0.1), transparent)',
        border: '1px solid rgba(201,168,76,0.2)',
        animation: 'pulseGold 3s ease-in-out infinite',
      }}>
        {/* X connexion SVG */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <line x1="6" y1="6" x2="26" y2="26" stroke="rgba(201,168,76,1)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="26" y1="6" x2="6" y2="26" stroke="rgba(201,168,76,1)" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="6"  cy="6"  r="3" fill="rgba(201,168,76,1)"/>
          <circle cx="26" cy="6"  r="3" fill="rgba(201,168,76,1)"/>
          <circle cx="6"  cy="26" r="3" fill="rgba(201,168,76,1)"/>
          <circle cx="26" cy="26" r="3" fill="rgba(201,168,76,1)"/>
        </svg>
      </div>

      <div>
        <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.6rem', color: 'rgba(28,24,20,0.9)', marginBottom: '10px' }}>
          Pas encore de connexion
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.9)', lineHeight: 1.7 }}>
          Explorez des profils et envoyez<br/>des demandes de connexion.
        </p>
      </div>

      <div style={{ fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(201,168,76,1)', textTransform: 'uppercase' }}>
        ∞ · Connectés par désir · ∞
      </div>
    </div>
  )
}
