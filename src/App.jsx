import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { supabase } from './lib/supabase'

import ErrorBoundary from './components/ErrorBoundary'
import Navbar       from './components/Navbar'
import { ToastContainer } from './components/Toast'
import { ConfirmDialogHost } from './components/ConfirmDialog'
import MatchModal   from './components/MatchModal'
import CookieBanner from './components/CookieBanner'
import WeCanTrack   from './components/WeCanTrack'

const Home           = lazy(() => import('./pages/Home'))
const Login          = lazy(() => import('./pages/Login'))
const Register       = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword  = lazy(() => import('./pages/ResetPassword'))
const Onboarding     = lazy(() => import('./pages/Onboarding'))
const MotDuJour      = lazy(() => import('./pages/MotDuJour'))
const Lire           = lazy(() => import('./pages/Lire'))
const Personne       = lazy(() => import('./pages/Personne'))
const Carnet         = lazy(() => import('./pages/Carnet'))
const Matches        = lazy(() => import('./pages/Matches'))
const Messages       = lazy(() => import('./pages/Messages'))
const Conversation   = lazy(() => import('./pages/Conversation'))
const Profile        = lazy(() => import('./pages/Profile'))
const Settings       = lazy(() => import('./pages/Settings'))
const Admin          = lazy(() => import('./pages/Admin'))
const CGU            = lazy(() => import('./pages/CGU'))
const Confidentialite = lazy(() => import('./pages/Confidentialite'))
const Contact        = lazy(() => import('./pages/Contact'))
const Boutique       = lazy(() => import('./pages/Boutique'))
const Produit        = lazy(() => import('./pages/Produit'))
const NotFound           = lazy(() => import('./pages/NotFound'))

const PageLoader = () => (
  <div className="flex h-dvh items-center justify-center" role="status" aria-label="Chargement…">
    <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
  </div>
)

/**
 * L'accueil, ou l'app.
 *
 * Un membre connecte n'a rien a faire sur la page de presentation : il
 * vient pour lire et pour ecrire, on l'y emmene directement. La page
 * publique reste rendue pendant le chargement de la session — c'est le
 * cas de loin le plus frequent, et elle doit s'afficher sans attendre.
 */
function AccueilOuApp() {
  const { user, profile, loading } = useAuthStore()
  if (!loading && user && profile?.email_1_confirmed) {
    return <Navigate to="/lire" replace />
  }
  return <Home />
}

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
  return children
}

export default function App() {
  const location = useLocation()
  const init    = useAuthStore(s => s.init)
  const cleanup = useAuthStore(s => s.cleanup)
  const profile = useAuthStore(s => s.profile)
  const user    = useAuthStore(s => s.user)
  const [newMatch, setNewMatch] = useState(null)

  // Sans cet appel, loading reste a true et toute route protegee tourne
  // dans le vide. Le mode demo, lui, met loading a false directement :
  // c'est pourquoi le bug ne se voyait qu'avec un vrai compte.
  useEffect(() => { init(); return () => cleanup() }, [init, cleanup])

  // écoute les nouveaux matchs en realtime pour afficher la modal
  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('new-matches')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'matches',
      }, async payload => {
        const m = payload.new
        if (m.member_a !== profile.id && m.member_b !== profile.id) return

        const otherId = m.member_a === profile.id ? m.member_b : m.member_a
        const { data: other } = await supabase
          .from('profiles').select('id, display_name').eq('id', otherId).single()

        setNewMatch({ id: m.id, me: profile, other })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile])

  // La barre du membre n'apparait que dans l'app. Sur les pages
  // publiques — presentation, conditions, boutique — elle flottait au
  // milieu du contenu et coupait la page en deux.
  const PAGES_PUBLIQUES = ['/', '/login', '/register', '/forgot-password',
                           '/reset-password', '/cgu', '/confidentialite',
                           '/contact', '/boutique']
  const surPagePublique = PAGES_PUBLIQUES.includes(location.pathname)
    || location.pathname.startsWith('/boutique/')
  const showNav = user && profile?.email_1_confirmed && !surPagePublique

  return (
    <div className="min-h-dvh bg-bg text-text" style={{ position: 'relative' }}>

      <ToastContainer />
      <ConfirmDialogHost />
      <CookieBanner />
      <WeCanTrack />

      {showNav && <Navbar />}

      {newMatch && (
        <MatchModal match={newMatch} onClose={() => setNewMatch(null)} />
      )}

      <div className={showNav ? 'pb-20' : ''} style={{ position: 'relative', zIndex: 1 }}>
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                  element={<AccueilOuApp />} />
            <Route path="/login"             element={<Login />} />
            <Route path="/register"          element={<Register />} />
            <Route path="/forgot-password"   element={<ForgotPassword />} />
            <Route path="/reset-password"    element={<ResetPassword />} />
            <Route path="/cgu"               element={<CGU />} />
            <Route path="/confidentialite"   element={<Confidentialite />} />
            <Route path="/contact"           element={<Contact />} />

            {/* La Papeterie — publique : on peut acheter sans compte */}
            <Route path="/boutique"          element={<Boutique />} />
            <Route path="/boutique/:slug"    element={<Produit />} />

            <Route path="/onboarding" element={
              <RequireAuth><Onboarding /></RequireAuth>
            } />

            <Route path="/lire" element={
              <RequireAuth><RequireProfile><Lire /></RequireProfile></RequireAuth>
            } />
            <Route path="/personne/:id" element={
              <RequireAuth><RequireProfile><Personne /></RequireProfile></RequireAuth>
            } />
            <Route path="/mot-du-jour" element={
              <RequireAuth><RequireProfile><MotDuJour /></RequireProfile></RequireAuth>
            } />
            <Route path="/carnet" element={
              <RequireAuth><RequireProfile><Carnet /></RequireProfile></RequireAuth>
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
        </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}
