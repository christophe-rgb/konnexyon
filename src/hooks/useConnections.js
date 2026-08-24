import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { toast } from '../components/Toast'
import { connectionsLeft, DAILY_CONNECTION_QUOTA } from '../lib/dailyWord'

// 42501 = new row violates row-level security policy.
// C'est ainsi que remonte le quota 3/jour, pose dans la policy likes_insert.
const RLS_VIOLATION = '42501'
const DUPLICATE_KEY = '23505'

/**
 * Le quota de connexions du jour et le geste de se connecter.
 *
 * Le plafond vit dans la policy likes_insert : ce hook n'affiche que ce
 * que la base autorise, il ne le decide pas.
 */
export function useConnections() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const [left, setLeft] = useState(DAILY_CONNECTION_QUOTA)

  const refresh = useCallback(async () => {
    if (demoMode || !profile?.id) return
    const { data } = await supabase.rpc('get_daily_connections_left')
    // la RPC renvoie les connexions restantes ; on repasse par le helper
    // pour borner une reponse absente ou hors bornes
    setLeft(connectionsLeft(DAILY_CONNECTION_QUOTA - (data ?? DAILY_CONNECTION_QUOTA)))
  }, [profile?.id, demoMode])

  useEffect(() => { refresh() }, [refresh])

  const connect = async (userId) => {
    if (!userId) return false
    if (userId === profile?.id) return false          // garde anti-auto-connexion
    if (left <= 0) { toast('Quota de connexions atteint pour aujourd’hui.', 'error'); return false }

    if (demoMode) {
      setLeft(n => Math.max(0, n - 1))
      toast('Demande de connexion envoyée ✓')
      return true
    }

    const { error } = await supabase.from('likes').insert({ from_id: profile.id, to_id: userId })

    if (error?.code === RLS_VIOLATION) {
      setLeft(0)
      toast('Quota de connexions atteint pour aujourd’hui.', 'error')
      return false
    }
    if (error && error.code !== DUPLICATE_KEY) {
      toast(`Erreur ${error.code} : ${error.message}`, 'error')
      return false
    }

    setLeft(n => Math.max(0, n - 1))
    return true
  }

  return { left, connect, refresh }
}
