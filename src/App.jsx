import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { supabase } from './lib/supabase'

import Navbar       from './components/Navbar'
import { ToastContainer } from './components/Toast'
import MatchModal   from './components/MatchModal'
import Home           from './pages/Home'
import Login          from './pages/Login'
import Register       from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'
import ConfirmPartner from './pages/ConfirmPartner'
import Onboarding     from './pages/Onboarding'
import Discover     from './pages/Discover'
import Matches      from './pages/Matches'
import Messages     from './pages/Messages'
import Conversation from './pages/Conversation'
import Profile      from './pages/Profile'
import Settings     from './pages/Settings'
import Admin        from './pages/Admin'
import Abonnement  from './pages/Abonnement'

function RequireAuth({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div className="flex h-dvh items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireProfile({ children }) {
  const { profile, loading } = useAuthStore()
  if (loading) return null
  if (!profile || !profile.email_1_confirmed) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  const init    = useAuthStore(s => s.init)
  const profile = useAuthStore(s => s.profile)
  const user    = useAuthStore(s => s.user)
  const [newMatch, setNewMatch] = useState(null)

  useEffect(() => { init() }, [init])

  // écoute les nouveaux matchs en realtime pour afficher la modal
  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('new-matches')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'matches',
      }, async payload => {
        const m = payload.new
        if (m.couple_a !== profile.id && m.couple_b !== profile.id) return

        const otherId = m.couple_a === profile.id ? m.couple_b : m.couple_a
        const { data: other } = await supabase
          .from('profiles').select('id, couple_name, avatar_url').eq('id', otherId).single()

        setNewMatch({ id: m.id, me: profile, other })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile])

  const showNav = user && profile?.email_1_confirmed

  return (
    <div className="min-h-dvh bg-bg text-text" style={{ position: 'relative' }}>

      {/* Filigrane logo — toutes les pages */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          style={{
            width: '110vw',
            maxWidth: '680px',
            opacity: 0.18,
            filter: 'brightness(1.3)',
            userSelect: 'none',
          }}
        />
      </div>

      <ToastContainer />

      {showNav && <Navbar />}

      {newMatch && (
        <MatchModal match={newMatch} onClose={() => setNewMatch(null)} />
      )}

      <div className={showNav ? 'pb-20' : ''} style={{ position: 'relative', zIndex: 1 }}>
        <Routes>
          <Route path="/"                  element={<Home />} />
          <Route path="/login"             element={<Login />} />
          <Route path="/register"          element={<Register />} />
          <Route path="/forgot-password"   element={<ForgotPassword />} />
          <Route path="/reset-password"    element={<ResetPassword />} />
          <Route path="/confirm-partner"   element={<ConfirmPartner />} />

          <Route path="/onboarding" element={
            <RequireAuth><Onboarding /></RequireAuth>
          } />

          <Route path="/discover" element={
            <RequireAuth><RequireProfile><Discover /></RequireProfile></RequireAuth>
          } />
          <Route path="/matches" element={
            <RequireAuth><RequireProfile><Matches /></RequireProfile></RequireAuth>
          } />
          <Route path="/messages/:matchId" element={
            <RequireAuth><RequireProfile><Conversation /></RequireProfile></RequireAuth>
          } />
          <Route path="/messages" element={
            <RequireAuth><RequireProfile><Messages /></RequireProfile></RequireAuth>
          } />
          <Route path="/profile/:id?" element={
            <RequireAuth><RequireProfile><Profile /></RequireProfile></RequireAuth>
          } />
          <Route path="/settings" element={
            <RequireAuth><RequireProfile><Settings /></RequireProfile></RequireAuth>
          } />
          <Route path="/abonnement" element={
            <RequireAuth><RequireProfile><Abonnement /></RequireProfile></RequireAuth>
          } />
          <Route path="/admin" element={
            <RequireAuth><Admin /></RequireAuth>
          } />
        </Routes>
      </div>
    </div>
  )
}
