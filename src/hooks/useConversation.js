import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { DEMO_MATCHES, DEMO_MESSAGES } from '../lib/demo'
import { toast } from '../components/Toast'
import { confirm } from '../components/ConfirmDialog'
import { validateImageFile, validateImageMagicBytes } from '../lib/upload'

const PAGE_SIZE = 50

export function useConversation(matchId) {
  const profile      = useAuthStore(s => s.profile)
  const demoMode     = useAuthStore(s => s.demoMode)
  const navigate     = useNavigate()

  const [messages,     setMessages]     = useState([])
  const [otherProfile, setOther]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [hasMore,      setHasMore]      = useState(false)
  const [sending,      setSending]      = useState(false)
  const [uploading,    setUploading]    = useState(false)

  const oldestRef    = useRef(null)
  const sendingRef   = useRef(false)
  const channelRef   = useRef(null)
  const isMountedRef = useRef(true)

  // ─── Initialisation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId || !profile) return
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(matchId)) { navigate('/messages'); return }

    isMountedRef.current = true
    const isMounted = () => isMountedRef.current

    if (demoMode) {
      const match = DEMO_MATCHES.find(m => m.id === matchId)
      if (match) setOther(match.profile)
      setMessages(DEMO_MESSAGES[matchId] || [])
      setLoading(false)
      return
    }

    const loadMatch = async () => {
      const { data: m } = await supabase
        .from('matches').select('couple_a, couple_b').eq('id', matchId).single()
      if (!m || !isMounted()) return
      const otherId = m.couple_a === profile.id ? m.couple_b : m.couple_a
      const { data: p } = await supabase
        .from('profiles').select('id, couple_name, avatar_url').eq('id', otherId).single()
      if (isMounted()) setOther(p)
    }

    const loadMessages = async () => {
      const { data, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('match_id', matchId)
        .or(`deleted_for.is.null,deleted_for.not.cs.{${profile.id}}`)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (!isMounted()) return
      const page = (data || []).reverse()
      if (page.length > 0) oldestRef.current = page[0].created_at
      setHasMore((count || 0) > page.length)
      setMessages(page)
      setLoading(false)

      const unread = page.filter(m => m.sender_id !== profile.id && !m.read_at)
      if (unread.length) {
        await supabase.from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unread.map(m => m.id))
      }
    }

    loadMatch()
    loadMessages()

    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const channel = supabase
      .channel(`chat-${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, payload => {
        if (!isMountedRef.current) return
        setMessages(ms =>
          ms.some(x => x.id === payload.new.id) ? ms : [...ms, payload.new]
        )
        if (payload.new.sender_id !== profile.id) markRead(payload.new.id)
      })
      .subscribe()
    channelRef.current = channel

    return () => {
      isMountedRef.current = false
      supabase.removeChannel(channel).catch(() => {})
      channelRef.current = null
    }
  }, [matchId, profile])

  // ─── Actions ──────────────────────────────────────────────────────────────
  const markRead = async (msgId) => {
    await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msgId)
  }

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)

    const { data, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('match_id', matchId)
      .or(`deleted_for.is.null,deleted_for.not.cs.{${profile.id}}`)
      .lt('created_at', oldestRef.current)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    const older = (data || []).reverse()
    if (older.length > 0) oldestRef.current = older[0].created_at
    setHasMore(older.length === PAGE_SIZE)
    setMessages(ms => {
      const deduped = older.filter(m => !ms.some(x => x.id === m.id))
      return [...deduped, ...ms]
    })
    setLoadingMore(false)
    return { prevScrollHeight: null } // scroll restauration gérée par le composant
  }

  const send = async (content) => {
    if (!content || sendingRef.current) return
    sendingRef.current = true
    setSending(true)

    if (demoMode) {
      const newMsg = {
        id: `demo-msg-${Date.now()}`,
        match_id: matchId,
        sender_id: profile.id,
        content,
        photo_url: null,
        read_at: null,
        deleted_for: [],
        created_at: new Date().toISOString(),
      }
      setMessages(ms => [...ms, newMsg])
      setSending(false)
      sendingRef.current = false
      return
    }

    try {
      const { error } = await supabase.from('messages').insert({
        match_id:  matchId,
        sender_id: profile.id,
        content,
      })
      if (error) toast(`Erreur ${error.code}: ${error.message}`, 'error')
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }

  const sendPhoto = async (file) => {
    const check = validateImageFile(file)
    if (!check.ok) { toast(check.error, 'error'); return }
    const magic = await validateImageMagicBytes(file)
    if (!magic.ok) { toast(magic.error, 'error'); return }
    setUploading(true)

    const ext  = file.name.split('.').pop()
    const path = `${matchId}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from('chat-photos').upload(path, file)
    if (upErr) { toast('Erreur upload photo', 'error'); setUploading(false); return }

    const TTL_SECONDS = 7 * 24 * 3600
    const { data: signedData, error: signErr } = await supabase.storage
      .from('chat-photos')
      .createSignedUrl(path, TTL_SECONDS)
    if (signErr || !signedData?.signedUrl) {
      await supabase.storage.from('chat-photos').remove([path])
      toast('Erreur génération URL photo', 'error')
      setUploading(false)
      return
    }

    const { error: insertErr } = await supabase.from('messages').insert({
      match_id:         matchId,
      sender_id:        profile.id,
      photo_url:        signedData.signedUrl,
      photo_expires_at: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
    })
    if (insertErr) {
      await supabase.storage.from('chat-photos').remove([path])
      toast('Erreur envoi photo', 'error')
    }
    setUploading(false)
  }

  const deleteMessage = async (msgId) => {
    setMessages(ms => ms.filter(m => m.id !== msgId))
    await supabase.rpc('delete_message_for_user', { message_id: msgId, user_id: profile.id })
  }

  const deleteMatch = async () => {
    const ok = await confirm({
      title: 'Annuler la connexion',
      message: 'La conversation sera définitivement supprimée. Continuer ?',
      confirmLabel: 'Annuler le match',
      cancelLabel: 'Garder',
      danger: true,
    })
    if (!ok) return
    const { error } = await supabase.from('matches').delete().eq('id', matchId)
    if (error) { toast(`Erreur : ${error.message}`, 'error'); return }
    navigate('/matches')
    toast('Match annulé')
  }

  return {
    messages,
    otherProfile,
    loading,
    loadingMore,
    hasMore,
    sending,
    uploading,
    send,
    sendPhoto,
    deleteMessage,
    deleteMatch,
    loadMore,
  }
}
