import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { supabase } from './lib/supabase'

import Navbar       from './components/Navbar'
import { ToastContainer } from './components/Toast'
import MatchModal   from './components/MatchModal'
import AgeGate      from './components/AgeGate'
import CookieBanner from './components/CookieBanner'

const Home           = lazy(() => import('./pages/Home'))
const Login          = lazy(() => import('./pages/Login'))
const Register       = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword  = lazy(() => import('./pages/ResetPassword'))
const ConfirmPartner = lazy(() => import('./pages/ConfirmPartner'))
const Onboarding     = lazy(() => import('./pages/Onboarding'))
const Discover       = lazy(() => import('./pages/Discover'))
const Matches        = lazy(() => import('./pages/Matches'))
const Messages       = lazy(() => import('./pages/Messages'))
const Conversation   = lazy(() => import('./pages/Conversation'))
const Profile        = lazy(() => import('./pages/Profile'))
const Settings       = lazy(() => import('./pages/Settings'))
const Admin          = lazy(() => import('./pages/Admin'))
const Abonnement     = lazy(() => import('./pages/Abonnement'))
const CGU            = lazy(() => import('./pages/CGU'))
const Confidentialite = lazy(() => import('./pages/Confidentialite'))
const Contact        = lazy(() => import('./pages/Contact'))
const Blog           = lazy(() => import('./pages/Blog'))
const BlogArticle    = lazy(() => import('./pages/BlogArticle'))
const BlogCountryList    = lazy(() => import('./pages/BlogCountry').then(m => ({ default: m.BlogCountryList })))
const BlogCountryArticle = lazy(() => import('./pages/BlogCountry').then(m => ({ default: m.BlogCountryArticle })))

const PageLoader = () => (
  <div className="flex h-dvh items-center justify-center">
    <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
  </div>
)

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
  const [ageConfirmed, setAgeConfirmed] = useState(
    () => localStorage.getItem('age_confirmed') === '1'
  )

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

  if (!ageConfirmed) return <AgeGate onConfirm={() => setAgeConfirmed(true)} />

  const panicExit = async () => {
    localStorage.removeItem('age_confirmed')
    await supabase.auth.signOut()
    window.location.replace('https://www.google.fr')
  }

  return (
    <div className="min-h-dvh bg-bg text-text" style={{ position: 'relative' }}>

      {/* Bouton panique — discret, toujours visible */}
      <button
        onClick={panicExit}
        title="Fermer"
        aria-label="Fermer le site"
        style={{
          position: 'fixed',
          top: '90px',
          right: '14px',
          zIndex: 9999,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(200,190,175,0.55)',
          border: '1px solid rgba(28,24,20,0.08)',
          color: 'rgba(220,50,50,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '16px',
          backdropFilter: 'blur(6px)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(60,20,20,0.85)'
          e.currentTarget.style.color = 'rgba(255,80,80,1)'
          e.currentTarget.style.borderColor = 'rgba(220,50,50,0.4)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(200,190,175,0.55)'
          e.currentTarget.style.color = 'rgba(220,50,50,0.85)'
          e.currentTarget.style.borderColor = 'rgba(28,24,20,0.08)'
        }}
      >
        ⚠
      </button>

      <ToastContainer />
      <CookieBanner />

      {showNav && <Navbar />}

      {newMatch && (
        <MatchModal match={newMatch} onClose={() => setNewMatch(null)} />
      )}

      <div className={showNav ? 'pb-20' : ''} style={{ position: 'relative', zIndex: 1 }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                  element={<Home />} />
            <Route path="/login"             element={<Login />} />
            <Route path="/register"          element={<Register />} />
            <Route path="/forgot-password"   element={<ForgotPassword />} />
            <Route path="/reset-password"    element={<ResetPassword />} />
            <Route path="/confirm-partner"   element={<ConfirmPartner />} />
            <Route path="/cgu"               element={<CGU />} />
            <Route path="/confidentialite"   element={<Confidentialite />} />
            <Route path="/contact"           element={<Contact />} />
            <Route path="/blog"              element={<Blog />} />
            <Route path="/blog/:slug"        element={<BlogArticle />} />
            <Route path="/belgique"          element={<BlogCountryList country="belgique" />} />
            <Route path="/belgique/:slug"    element={<BlogCountryArticle country="belgique" />} />
            <Route path="/suisse"            element={<BlogCountryList country="suisse" />} />
            <Route path="/suisse/:slug"      element={<BlogCountryArticle country="suisse" />} />
            <Route path="/quebec"            element={<BlogCountryList country="quebec" />} />
            <Route path="/quebec/:slug"      element={<BlogCountryArticle country="quebec" />} />

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
        </Suspense>
      </div>
    </div>
  )
}
