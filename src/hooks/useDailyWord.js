import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { toast } from '../components/Toast'
import { validateLine } from '../lib/dailyWord'
import { DEMO_WORD } from '../lib/demo'

// déjà écrit depuis un autre onglet : ce n'est pas une erreur
const DUPLICATE_KEY = '23505'

/**
 * Le mot du jour et ma ligne.
 *
 * La lecture des lignes des autres n'est plus ici : elle a sa page
 * (/lire). Ce hook ne sert qu'au geste d'écriture.
 */
export function useDailyWord() {
  const profile  = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)

  const [loading, setLoading] = useState(true)
  const [word,    setWord]    = useState(null)
  const [myLine,  setMyLine]  = useState(null)
  const [sending, setSending] = useState(false)

  const sendingRef = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (demoMode) { setWord(DEMO_WORD); return }
      if (!profile?.id) return

      const { data: rows, error } = await supabase.rpc('get_word_of_the_day')
      if (error) {
        toast('Impossible de charger le mot du jour — ' + (error.message || 'réessayez'), 'error')
        return
      }
      const today = rows?.[0] || null
      setWord(today)
      if (!today) return

      const { data: mine } = await supabase
        .from('word_responses')
        .select('line')
        .eq('user_id', profile.id)
        .eq('daily_word_id', today.id)
        .maybeSingle()

      if (mine?.line) setMyLine(mine.line)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, demoMode])

  useEffect(() => { load() }, [load])

  const submitLine = async (raw) => {
    const check = validateLine(raw)
    if (!check.ok) { toast(check.error, 'error'); return false }
    if (!word)     { toast('Aucun mot publié aujourd’hui.', 'error'); return false }
    if (sendingRef.current) return false

    sendingRef.current = true
    setSending(true)
    try {
      if (demoMode) { setMyLine(check.line); return true }

      const { error } = await supabase.from('word_responses').insert({
        user_id:       profile.id,
        daily_word_id: word.id,
        line:          check.line,
      })
      if (error && error.code !== DUPLICATE_KEY) {
        toast(`Erreur ${error.code} : ${error.message}`, 'error')
        return false
      }
      setMyLine(check.line)
      return true
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  return { loading, word, myLine, sending, submitLine, reload: load }
}
