import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { toast } from '../components/Toast'
import { validateLine, connectionsLeft, DAILY_CONNECTION_QUOTA } from '../lib/dailyWord'
import { DEMO_WORD, DEMO_RESPONSES } from '../lib/demo'

// 42501 = new row violates row-level security policy.
// C'est ainsi que remonte le quota 3/jour, posé dans la policy likes_insert.
const RLS_VIOLATION   = '42501'
const DUPLICATE_KEY   = '23505'

/**
 * Mot du jour : le mot, ma ligne, les lignes des autres, le quota.
 *
 * Les lignes des autres ne sont chargées qu'une fois la mienne écrite —
 * la règle est appliquée en base (get_today_responses), on ne fait ici
 * que suivre le même ordre pour éviter un aller-retour inutile.
 */
export function useDailyWord() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)

  const [loading,   setLoading]   = useState(true)
  const [word,      setWord]      = useState(null)
  const [myLine,    setMyLine]    = useState(null)   // string | null
  const [responses, setResponses] = useState([])
  const [left,      setLeft]      = useState(DAILY_CONNECTION_QUOTA)
  const [sending,   setSending]   = useState(false)

  const sendingRef = useRef(false)

  // ── chargement ──────────────────────────────────────────────
  const loadResponses = useCallback(async () => {
    if (demoMode) { setResponses(DEMO_RESPONSES); return }
    const { data, error } = await supabase.rpc('get_today_responses')
    if (error) {
      toast('Impossible de charger les lignes du jour — ' + (error.message || 'réessayez'), 'error')
      return
    }
    setResponses(data || [])
  }, [demoMode])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (demoMode) {
        setWord(DEMO_WORD)
        return
      }
      if (!profile?.id) return

      const { data: wordRows, error: wordErr } = await supabase.rpc('get_word_of_the_day')
      if (wordErr) {
        toast('Impossible de charger le mot du jour — ' + (wordErr.message || 'réessayez'), 'error')
        return
      }
      const today = wordRows?.[0] || null
      setWord(today)
      if (!today) return

      const [{ data: mine }, { data: quota }] = await Promise.all([
        supabase.from('word_responses')
          .select('line')
          .eq('user_id', profile.id)
          .eq('daily_word_id', today.id)
          .maybeSingle(),
        supabase.rpc('get_daily_connections_left'),
      ])

      // la RPC renvoie les connexions restantes ; on repasse par le helper
      // pour borner une réponse absente ou hors bornes (quota relevé en base)
      const used = DAILY_CONNECTION_QUOTA - (quota ?? DAILY_CONNECTION_QUOTA)
      setLeft(connectionsLeft(used))
      if (mine?.line) {
        setMyLine(mine.line)
        await loadResponses()
      }
    } finally {
      setLoading(false)
    }
  }, [profile?.id, demoMode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // ── écrire sa ligne ─────────────────────────────────────────
  const submitLine = async (raw) => {
    const check = validateLine(raw)
    if (!check.ok) { toast(check.error, 'error'); return false }
    if (!word)     { toast('Aucun mot publié aujourd’hui.', 'error'); return false }
    if (sendingRef.current) return false

    sendingRef.current = true
    setSending(true)
    try {
      if (demoMode) {
        setMyLine(check.line)
        setResponses(DEMO_RESPONSES)
        return true
      }

      const { error } = await supabase.from('word_responses').insert({
        user_id:       profile.id,
        daily_word_id: word.id,
        line:          check.line,
      })
      // déjà écrit depuis un autre onglet : ce n'est pas une erreur
      if (error && error.code !== DUPLICATE_KEY) {
        toast(`Erreur ${error.code} : ${error.message}`, 'error')
        return false
      }

      setMyLine(check.line)
      await loadResponses()
      return true
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  // ── se connecter à l'auteur d'une ligne ─────────────────────
  const connect = async (userId) => {
    if (!userId) return false
    if (userId === profile?.id) return false            // garde anti-auto-connexion
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
    toast('Demande de connexion envoyée ✓')
    return true
  }

  return { loading, word, myLine, responses, left, sending, submitLine, connect, reload: load }
}
