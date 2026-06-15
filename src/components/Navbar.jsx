import { NavLink, useLocation } from 'react-router-dom'
import { Compass, Zap, MessageCircle, User } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'

const tabs = [
  { to: '/discover', icon: Compass,       label: 'Explorer'   },
  { to: '/matches',  icon: Zap,           label: 'Connexions' },
  { to: '/messages', icon: MessageCircle, label: 'Messages'   },
  { to: '/profile',  icon: User,          label: 'Profil'     },
]

export default function Navbar() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const location = useLocation()
  const [unread, setUnread] = useState(0)

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
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 px-6 pointer-events-none animate-fade-in"
      style={{ animationFillMode: 'both', animationDelay: '300ms' }}
    >
      <ul
        className="flex justify-around items-center w-full max-w-sm pointer-events-auto"
        style={{
          background: 'rgba(8,8,8,0.94)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(201,168,76,0.16)',
          borderRadius: '999px',
          padding: '6px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(201,168,76,0.07), inset 0 1px 0 rgba(201,168,76,0.08)',
        }}
      >
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || (to !== '/discover' && location.pathname.startsWith(to))
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-full w-full"
                style={{
                  transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                  ...(isActive ? {
                    background: 'linear-gradient(135deg, #A07830 0%, #C9A84C 40%, #E8CC7A 70%, #C9A84C 100%)',
                    boxShadow: '0 2px 20px rgba(201,168,76,0.45)',
                    color: '#050505',
                    transform: 'scale(1.06)',
                  } : {
                    color: 'rgba(255,255,255,0.28)',
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
    </nav>
  )
}
