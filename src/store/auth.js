import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { resolveOnboardingLocation } from '../lib/geo'
import { DEMO_USER, DEMO_PROFILE } from '../lib/demo'

export const useAuthStore = create((set, get) => ({
  user:     null,
  profile:  null,
  loading:  true,
  demoMode: false,

  setDemo: () => {
    set({ user: DEMO_USER, profile: DEMO_PROFILE, loading: false, demoMode: true })
  },

  init: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await get().fetchProfile(session.user.id)
        set({ user: session.user, loading: false })
        get().backfillLocationIfMissing()
      } else {
        set({ loading: false })
      }
    } catch {
      set({ loading: false })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === 'INITIAL_SESSION') return
      if (get().demoMode) return
      if (session?.user) {
        await get().fetchProfile(session.user.id)
        set({ user: session.user })
        get().backfillLocationIfMissing()
      } else {
        set({ user: null, profile: null })
      }
    })
    get()._subscription = subscription
  },

  cleanup: () => {
    const sub = get()._subscription
    sub?.unsubscribe()
  },

  setProfile: (profile) => set({ profile }),

  fetchProfile: async (uid) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()
    set({ profile: data })
  },

  // Backfill : les couples inscrits avant le fallback de géoloc ont pu être
  // créés sans `location` (GPS refusé à l'onboarding) et restent invisibles
  // sur la carte. À la première session, si la position manque, on la complète
  // automatiquement (GPS précis sinon IP approximatif). Une fois par session.
  _backfillDone: false,
  backfillLocationIfMissing: async () => {
    if (get().demoMode || get()._backfillDone) return
    set({ _backfillDone: true })
    try {
      const { data } = await supabase.rpc('get_my_location')
      if (data?.[0]) return // déjà localisé
      const loc = await resolveOnboardingLocation()
      if (!loc) return
      const uid = get().user?.id || (await supabase.auth.getUser()).data.user?.id
      if (!uid) return
      await supabase.from('profiles').update({
        location: `SRID=4326;POINT(${loc.lng} ${loc.lat})`,
        location_updated_at: new Date().toISOString(),
      }).eq('id', uid)
    } catch {
      // silencieux : le backfill réessaiera à la prochaine session
    }
  },

  signOut: async () => {
    const wasDemo = get().demoMode
    set({ user: null, profile: null, demoMode: false })
    if (!wasDemo) await supabase.auth.signOut()
  },
}))
