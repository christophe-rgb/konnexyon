import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { DEMO_MATCHES, DEMO_MESSAGES } from '../lib/demo'
import { MessageCircle } from 'lucide-react'
import { isPremium } from '../lib/plan'
import UpgradeModal from '../components/UpgradeModal'
import { useChatDock } from '../store/chatDock'

export default function Messages() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const navigate = useNavigate()
  const openChat = useChatDock(s => s.openChat)
  const [threads,     setThreads]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const premium = isPremium(profile)

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

    let isMounted = true

    const load = async () => {
      const { data, error } = await supabase
        .rpc('get_message_threads', { p_profile_id: profile.id })

      if (!isMounted) return
      if (error || !data) { setLoading(false); return }

      const threads = data
        .map(row => ({
          matchId: row.match_id,
          profile: {
            id:          row.other_id,
            couple_name: row.couple_name,
            avatar_url:  row.avatar_url,
          },
          lastMessage: row.created_at ? {
            content:    row.content,
            photo_url:  row.photo_url,
            created_at: row.created_at,
            sender_id:  row.sender_id,
            read_at:    row.read_at,
          } : null,
          unread: row.created_at && !row.read_at && row.sender_id !== profile.id,
        }))
        .sort((a, b) => {
          const ta = a.lastMessage?.created_at || ''
          const tb = b.lastMessage?.created_at || ''
          return tb.localeCompare(ta)
        })
        .filter(t => t.profile.couple_name)

      if (!isMounted) return
      setThreads(threads)
      setLoading(false)
    }

    load()

    // Realtime : écoute les nouveaux messages sur tous les threads de ce profil.
    // RLS garantit que Supabase ne pousse que les messages auxquels l'utilisateur
    // a accès — pas besoin de filtre côté channel.
    const channel = supabase
      .channel(`messages-list-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          if (!isMounted) return
          const { match_id, content, photo_url, created_at, sender_id } = payload.new

          setThreads(prev => {
            const idx = prev.findIndex(t => t.matchId === match_id)
            if (idx === -1) {
              // Thread inconnu (nouvelle connexion ayant généré un 1er message) :
              // on recharge toute la liste depuis la DB.
              load()
              return prev
            }
            const updated = [...prev]
            updated[idx] = {
              ...updated[idx],
              lastMessage: { content, photo_url, created_at, sender_id, read_at: null },
              unread: sender_id !== profile.id,
            }
            // Remettre en tête de liste
            const [thread] = updated.splice(idx, 1)
            return [thread, ...updated]
          })
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [profile])

  return (
    <div className="max-w-lg mx-auto pb-nav">

      {/* header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 animate-fade-in"
        style={{
          background: 'rgba(253,250,246,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(201,168,76,0.15)',
          animationFillMode: 'both',
        }}
      >
        <div>
          <h1 style={{
            fontFamily: 'Cormorant, serif',
            fontSize: '1.8rem',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #B8891F, #F4D875, #B8891F)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.03em',
          }}>
            Messages
          </h1>
          {!loading && threads.length > 0 && (
            <p style={{ fontSize: '11px', color: 'rgba(201,168,76,1)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '2px' }}>
              {threads.length} conversation{threads.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(201,168,76,0.1), rgba(201,168,76,0.1))',
          border: '1px solid rgba(201,168,76,0.2)',
        }}>
          <MessageCircle size={16} strokeWidth={1.5} style={{ color: 'rgba(201,168,76,1)' }} />
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col gap-2 px-4 pt-4">
          {[1,2,3].map(i => (
            <div key={i} style={{
              height: 72, borderRadius: '16px',
              background: 'rgba(245,240,232,0.6)',
              border: '1px solid rgba(201,168,76,0.2)',
              animation: 'pulseGold 1.8s ease-in-out infinite',
              animationDelay: `${i * 200}ms`,
            }} />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col px-4 pt-3 gap-2">
          {threads.map((t, i) => (
            <button
              key={t.matchId}
              onClick={() => openChat(t.matchId)}
              className="erb-btn animate-fade-in-up"
              style={{
                animationDelay: `${i * 50}ms`,
                animationFillMode: 'both',
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px',
                borderRadius: '18px',
                background: t.unread
                  ? 'linear-gradient(135deg, rgba(245,240,232,0.95) 0%, rgba(237,231,219,0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(248,244,238,0.9) 0%, rgba(245,240,232,0.95) 100%)',
                border: t.unread
                  ? '1px solid rgba(201,168,76,0.45)'
                  : '1px solid rgba(201,168,76,0.12)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s',
                boxShadow: t.unread ? '0 4px 20px rgba(201,168,76,0.18)' : '0 1px 6px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = t.unread ? 'rgba(201,168,76,0.45)' : 'rgba(201,168,76,0.12)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {/* avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '14px', overflow: 'hidden',
                  border: '1px solid rgba(201,168,76,0.2)',
                  background: '#EDE7DB',
                }}>
                  {t.profile?.avatar_url ? (
                    <img src={t.profile.avatar_url} alt={t.profile?.couple_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant, serif', fontSize: '20px', color: 'rgba(201,168,76,1)' }}>
                      {t.profile?.couple_name?.[0]}
                    </div>
                  )}
                </div>
                {t.unread && (
                  <span style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 11, height: 11, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #A07830, #E8CC7A)',
                    border: '2px solid #FDFAF6',
                    boxShadow: '0 0 6px rgba(201,168,76,0.45)',
                  }} />
                )}
              </div>

              {/* texte */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: 'Cormorant, serif',
                  fontSize: '1.05rem',
                  fontWeight: t.unread ? 600 : 500,
                  color: t.unread ? '#1C1814' : 'rgba(28,24,20,0.9)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: '2px',
                }}>
                  {t.profile?.couple_name}
                </p>
                {t.lastMessage && (
                  <p style={{
                    fontSize: '12px',
                    color: t.unread ? 'rgba(201,168,76,1)' : 'rgba(28,24,20,0.7)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontStyle: t.unread ? 'normal' : 'italic',
                  }}>
                    {t.lastMessage.content || 'Photo'}
                  </p>
                )}
              </div>

              {/* date */}
              {t.lastMessage && (
                <span style={{
                  fontSize: '10px',
                  color: t.unread ? 'rgba(201,168,76,1)' : 'rgba(28,24,20,0.7)',
                  flexShrink: 0,
                  letterSpacing: '0.04em',
                }}>
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-10 gap-6 animate-fade-in" style={{ animationFillMode: 'both' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle, rgba(201,168,76,0.1), transparent)',
        border: '1px solid rgba(201,168,76,0.2)',
      }}>
        <MessageCircle size={28} strokeWidth={1} style={{ color: 'rgba(201,168,76,1)' }} />
      </div>
      <div>
        <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.6rem', color: 'rgba(28,24,20,1)', marginBottom: '10px' }}>
          Aucune conversation
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.7)', lineHeight: 1.7 }}>
          Le chat se débloque après<br/>une connexion mutuelle.
        </p>
      </div>
      <div style={{ fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(201,168,76,1)', textTransform: 'uppercase' }}>
        ∞ · Connectés par désir · ∞
      </div>
    </div>
  )
}
