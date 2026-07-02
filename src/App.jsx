import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { supabase } from './lib/supabase'
import { safeGet, safeSet, safeRemove } from './lib/storage'

import ErrorBoundary from './components/ErrorBoundary'
import Navbar       from './components/Navbar'
import { ToastContainer } from './components/Toast'
import { ConfirmDialogHost } from './components/ConfirmDialog'
import MatchModal   from './components/MatchModal'
import AgeGate      from './components/AgeGate'
import CookieBanner from './components/CookieBanner'
import ChatDock     from './components/ChatDock'
import MusicPlayer  from './components/MusicPlayer'
import SmoothScroll from './components/SmoothScroll'
import PageTransition from './components/PageTransition'

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
const CGU            = lazy(() => import('./pages/CGU'))
const Confidentialite = lazy(() => import('./pages/Confidentialite'))
const Contact        = lazy(() => import('./pages/Contact'))
const Blog           = lazy(() => import('./pages/Blog'))
const Lieux          = lazy(() => import('./pages/Lieux'))
const Partenaire     = lazy(() => import('./pages/Partenaire'))
const BlogArticle    = lazy(() => import('./pages/BlogArticle'))
const BlogCountryList    = lazy(() => import('./pages/BlogCountry').then(m => ({ default: m.BlogCountryList })))
const BlogCountryArticle = lazy(() => import('./pages/BlogCountry').then(m => ({ default: m.BlogCountryArticle })))
const NotFound           = lazy(() => import('./pages/NotFound'))

const PageLoader = () => (
  <div className="flex h-dvh items-center justify-center" role="status" aria-label="Chargement…">
    <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
  </div>
)

function RequireAuth({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div className="flex h-dvh items-center justify-center" role="status" aria-label="Chargement…">
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
  if (!profile.age_confirmed_at) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  const init    = useAuthStore(s => s.init)
  const cleanup = useAuthStore(s => s.cleanup)
  const profile = useAuthStore(s => s.profile)
  const user    = useAuthStore(s => s.user)
  const [newMatch, setNewMatch] = useState(null)
  const [ageConfirmed, setAgeConfirmed] = useState(
    () => safeGet('age_confirmed') === '1'
  )

  useEffect(() => { init(); return () => cleanup() }, [init, cleanup])

  // Vérification hybride age_confirmed : localStorage + Supabase profiles
  // Empêche l'injection manuelle de la clé localStorage sans validation réelle
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('age_confirmed_at')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        if (data.age_confirmed_at) {
          // La DB confirme l'âge — synchroniser localStorage si absent
          if (safeGet('age_confirmed') !== '1') {
            safeSet('age_confirmed', '1')
          }
          setAgeConfirmed(true)
        } else {
          // Pas de confirmation DB — invalider la clé localStorage injectée
          safeRemove('age_confirmed')
          setAgeConfirmed(false)
        }
      })
  }, [user])

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
    safeRemove('age_confirmed')
    await supabase.auth.signOut()
    window.location.replace('https://www.google.fr')
  }

  return (
    <div className="min-h-dvh bg-bg text-text" style={{ position: 'relative' }}>

      {/* Bouton sortie rapide — clair et labellisé */}
      <button
        onClick={panicExit}
        title="Quitter le site rapidement"
        aria-label="Quitter le site rapidement"
        style={{
          position: 'fixed',
          top: '90px',
          right: '14px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 13px 7px 10px',
          borderRadius: '999px',
          background: 'rgba(220,50,50,0.92)',
          border: '1px solid rgba(255,255,255,0.35)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 14px rgba(220,50,50,0.35)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(190,30,30,1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,50,50,0.92)'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Sortie
      </button>

      <SmoothScroll />
      <ToastContainer />
      <ConfirmDialogHost />
      <CookieBanner />

      {showNav && <Navbar />}

      {/* Musique de fond (chansons hébergées, démarre au 1er geste).
          Isolé dans une ErrorBoundary : une erreur du lecteur ne doit jamais
          faire planter tout le site. */}
      <ErrorBoundary><MusicPlayer /></ErrorBoundary>

      {/* Dock de chat global (fenêtres façon Messenger) */}
      {user && profile?.email_1_confirmed && <ChatDock />}

      {newMatch && (
        <MatchModal match={newMatch} onClose={() => setNewMatch(null)} />
      )}

      {/* Pas de padding ici : chaque page gère son espace bas (pb-nav = 6rem).
          Évite le double padding qui créait une grande bande vide sous la barre. */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <PageTransition>
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
            <Route path="/lieux"             element={<Lieux />} />
            <Route path="/partenaire"        element={<Partenaire />} />
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
            <Route path="/admin" element={
              <RequireAuth><Admin /></RequireAuth>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </PageTransition>
        </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}
