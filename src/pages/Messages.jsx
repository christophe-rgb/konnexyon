import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { DEMO_MATCHES, DEMO_MESSAGES } from '../lib/demo'
import { MessageCircle } from 'lucide-react'

export default function Messages() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const navigate = useNavigate()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (demoMode) {
      const t = DEMO_MATCHES.map(m => {
        const msgs = DEMO_MESSAGES[m.id] || []
        const last = msgs[msgs.length - 1]
        return { matchId: m.id, profile: m.profile, lastMessage: last || null, unread: false }
      })
      setThreads(t)
      setLoading(false)
      return
    }
    load()
  }, [profile])

  const load = async () => {
    const { data: matchData } = await supabase
      .from('matches')
      .select('id, couple_a, couple_b, created_at')
      .or(`couple_a.eq.${profile.id},couple_b.eq.${profile.id}`)

    if (!matchData) { setLoading(false); return }

    const threads = await Promise.all(matchData.map(async m => {
      const otherId = m.couple_a === profile.id ? m.couple_b : m.couple_a

      const { data: p } = await supabase
        .from('profiles')
        .select('id, couple_name, avatar_url')
        .eq('id', otherId)
        .single()

      const { data: msg } = await supabase
        .from('messages')
        .select('content, photo_url, created_at, sender_id, read_at')
        .eq('match_id', m.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const unread = msg && !msg.read_at && msg.sender_id !== profile.id

      return { matchId: m.id, profile: p, lastMessage: msg, unread }
    }))

    // trier par dernier message
    threads.sort((a, b) => {
      const ta = a.lastMessage?.created_at || ''
      const tb = b.lastMessage?.created_at || ''
      return tb.localeCompare(ta)
    })

    setThreads(threads.filter(t => t.profile))
    setLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-nav">
      <h1 className="font-serif text-3xl font-semibold mb-6">Messages</h1>

      {loading ? (
        <p className="text-muted text-sm">Chargement…</p>
      ) : threads.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle size={40} className="mx-auto text-muted/30 mb-3" strokeWidth={1} />
          <p className="font-serif text-2xl text-muted mb-2">Aucune conversation</p>
          <p className="text-sm text-muted/70">Le chat se débloque après un match mutuel.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[rgba(201,168,76,0.1)]">
          {threads.map(t => (
            <button
              key={t.matchId}
              onClick={() => navigate(`/messages/${t.matchId}`)}
              className="flex items-center gap-4 py-4 hover:bg-surface/50 -mx-4 px-4 transition-colors duration-150 cursor-pointer text-left"
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-surface2 overflow-hidden">
                  {t.profile.avatar_url ? (
                    <img src={t.profile.avatar_url} alt={t.profile.couple_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-serif text-xl text-gold/40">
                      {t.profile.couple_name?.[0]}
                    </div>
                  )}
                </div>
                {t.unread && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gold rounded-full border-2 border-bg" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${t.unread ? 'text-text' : 'text-muted'}`}>
                  {t.profile.couple_name}
                </p>
                {t.lastMessage && (
                  <p className={`text-sm truncate mt-0.5 ${t.unread ? 'text-text' : 'text-muted'}`}>
                    {t.lastMessage.content || '📷 Photo'}
                  </p>
                )}
              </div>

              {t.lastMessage && (
                <span className="text-[11px] text-muted flex-shrink-0">
                  {new Date(t.lastMessage.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
