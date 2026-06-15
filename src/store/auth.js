import { create } from 'zustand'
import { supabase } from '../lib/supabase'
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
      } else {
        set({ loading: false })
      }
    } catch {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (get().demoMode) return
      if (session?.user) {
        await get().fetchProfile(session.user.id)
        set({ user: session.user })
      } else {
        set({ user: null, profile: null })
      }
    })
  },

  fetchProfile: async (uid) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()
    set({ profile: data })
  },

  signOut: async () => {
    set({ user: null, profile: null, demoMode: false })
    if (!get().demoMode) await supabase.auth.signOut()
  },
}))
