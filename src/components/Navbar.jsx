import { NavLink, useLocation } from 'react-router-dom'
import { Compass, Zap, MessageCircle, User, Map, Play, Pause, SkipForward, X } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { useMusic } from '../store/music'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import Vumetre from './Vumetre'

const tabs = [
  {
    to: '/discover',
    icon: Compass,
    label: 'Explorer',
    match: loc => loc.pathname === '/discover' && !loc.search.includes('view=map'),
  },
  {
    to: '/discover?view=map',
    icon: Map,
    label: 'Carte',
    match: loc => loc.pathname === '/discover' && loc.search.includes('view=map'),
  },
  {
    to: '/matches',
    icon: Zap,
    label: 'Connexions',
    match: loc => loc.pathname.startsWith('/matches'),
  },
  {
    to: '/messages',
    icon: MessageCircle,
    label: 'Messages',
    match: loc => loc.pathname.startsWith('/messages'),
  },
  {
    to: '/profile',
    icon: User,
    label: 'Profil',
    match: loc => loc.pathname.startsWith('/profile'),
  },
]

export default function Navbar() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const location = useLocation()
  const [unread, setUnread] = useState(0)

  // état du lecteur de musique (poussé par MusicPlayer)
  const mActive  = useMusic(s => s.active)
  const mPlaying = useMusic(s => s.playing)
  const mTitle   = useMusic(s => s.title)
  const mToggle  = useMusic(s => s.toggle)
  const mNext    = useMusic(s => s.next)
  const mClose   = useMusic(s => s.close)

  useEffect(() => {
    if (!profile || demoMode) return
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages').select('id', { count: 'exact', head: true })
        .neq('sender_id', profile.id).is('read_at', null)
      setUnread(count || 0)
    }
    fetchUnread()
    const channel = supabase.channel('navbar-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        if (payload.new.sender_id !== profile.id) setUnread(n => n + 1)
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile, demoMode])

  useEffect(() => {
    if (location.pathname.startsWith('/messages')) setUnread(0)
  }, [location.pathname])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 px-4 pointer-events-none animate-fade-in"
      style={{ animationFillMode: 'both', animationDelay: '300ms' }}
    >
      <div
        className="flex items-center gap-2 sm:gap-3 w-full pointer-events-auto"
        style={{
          maxWidth: mActive ? 720 : 384,
          transition: 'max-width 0.35s ease',
          background: 'linear-gradient(135deg, rgba(22,18,9,0.95), rgba(9,9,9,0.97))',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(201,168,76,0.45)',
          borderRadius: '999px',
          padding: '6px 8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,168,76,0.14), inset 0 1px 0 rgba(201,168,76,0.12)',
        }}
      >
        {/* ── GAUCHE : vumètre (masqué sur très petits écrans) ── */}
        {mActive && (
          <div className="hidden xs:flex sm:flex items-center pl-1.5 pr-0.5" style={{ flexShrink: 0 }}>
            <Vumetre playing={mPlaying} />
          </div>
        )}

        {/* ── CENTRE : navigation ── */}
        <ul className="flex justify-around items-center flex-1 min-w-0">
          {tabs.map(({ to, icon: Icon, label, match }) => {
            const isActive = match(location)
            return (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex flex-col items-center gap-0.5 py-2 px-2 rounded-full w-full"
                  style={{
                    transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    ...(isActive ? {
                      background: 'linear-gradient(135deg, #A07830 0%, #C9A84C 40%, #E8CC7A 70%, #C9A84C 100%)',
                      boxShadow: '0 2px 12px rgba(201,168,76,0.2)',
                      color: '#050505',
                      transform: 'scale(1.06)',
                    } : {
                      color: 'rgba(240,237,232,0.82)',
                      transform: 'scale(1)',
                    }),
                  }}
                >
                  <div className="relative">
                    <Icon size={19} strokeWidth={isActive ? 2 : 1.5} />
                    {to === '/messages' && unread > 0 && (
                      <span
                        aria-label={`${unread} message(s) non lu(s)`}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center"
                        style={{ fontSize: '9px' }}
                      >
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: isActive ? 700 : 400, letterSpacing: '0.06em' }}>
                    {label}
                  </span>
                </NavLink>
              </li>
            )
          })}
        </ul>

        {/* ── DROITE : titre + play + suivant + fermer ── */}
        {mActive && (
          <div className="flex items-center gap-1.5 sm:gap-2 pr-1" style={{ flexShrink: 0 }}>
            <div className="hidden md:flex flex-col items-end" style={{ lineHeight: 1.15 }}>
              <span style={{ fontSize: 7.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(160,120,48,0.85)' }}>
                En lecture
              </span>
              <span style={{
                fontSize: 11, color: '#F0EDE8', fontWeight: 500,
                maxWidth: 130, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{mTitle}</span>
            </div>

            {/* play / pause — pastille dorée */}
            <button onClick={mToggle} aria-label={mPlaying ? 'Pause' : 'Lecture'} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', padding: 0,
              background: 'linear-gradient(135deg,#E8CC7A,#C9A84C)',
              border: '1px solid rgba(160,120,48,0.4)', color: '#1A1206',
              boxShadow: mPlaying ? '0 0 12px rgba(201,168,76,0.45)' : 'none',
            }}>
              {mPlaying ? <Pause size={15} strokeWidth={2.5} /> : <Play size={15} strokeWidth={2.5} />}
            </button>

            <button onClick={mNext} aria-label="Chanson suivante" style={ctrlBtn} className="hidden xs:flex sm:flex">
              <SkipForward size={15} />
            </button>
            <button onClick={mClose} aria-label="Couper la musique" style={ctrlBtn}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

const ctrlBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, borderRadius: '50%', flexShrink: 0, padding: 0,
  background: 'transparent', border: 'none', cursor: 'pointer', color: '#E8CC7A',
}
