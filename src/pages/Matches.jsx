import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { DEMO_MATCHES } from '../lib/demo'
import MatchCard from '../components/MatchCard'
import { MatchCardSkeleton } from '../components/Skeleton'

export default function Matches() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (demoMode) { setMatches(DEMO_MATCHES); setLoading(false); return }
    load()

    // realtime : nouveau match
    const channel = supabase
      .channel('matches-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => load())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile])

  const load = async () => {
    const { data } = await supabase
      .from('matches')
      .select(`
        id, created_at,
        couple_a, couple_b
      `)
      .or(`couple_a.eq.${profile.id},couple_b.eq.${profile.id}`)
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    // récupérer les profils de l'autre côté du match
    const enriched = await Promise.all(data.map(async m => {
      const otherId = m.couple_a === profile.id ? m.couple_b : m.couple_a

      const { data: p } = await supabase
        .from('profiles')
        .select('id, couple_name, avatar_url, bio')
        .eq('id', otherId)
        .single()

      // dernier message
      const { data: msg } = await supabase
        .from('messages')
        .select('content, photo_url, created_at')
        .eq('match_id', m.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return {
        ...m,
        profile: p,
        lastMessage: msg?.content || (msg?.photo_url ? '📷 Photo' : null),
      }
    }))

    setMatches(enriched.filter(m => m.profile))
    setLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-nav">
      <h1 className="font-serif text-3xl font-semibold mb-6">Vos matchs</h1>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <MatchCardSkeleton key={i} />)}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-serif text-2xl text-muted mb-2">Pas encore de match</p>
          <p className="text-sm text-muted/70">Likez des profils sur la page Découvrir !</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map(m => <MatchCard key={m.id} match={m} />)}
        </div>
      )}
    </div>
  )
}
