import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { DEMO_MATCHES, DEMO_MESSAGES } from '../lib/demo'
import ChatBubble from '../components/ChatBubble'
import EmojiPicker from '../components/EmojiPicker'
import { toast } from '../components/Toast'
import { ArrowLeft, Send, Image, Trash2 } from 'lucide-react'

export default function Conversation() {
  const { matchId }  = useParams()
  const profile      = useAuthStore(s => s.profile)
  const demoMode     = useAuthStore(s => s.demoMode)
  const navigate     = useNavigate()

  const [messages,     setMessages]     = useState([])
  const [otherProfile, setOther]        = useState(null)
  const [text,         setText]         = useState('')
  const [sending,      setSending]      = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [loading,      setLoading]      = useState(true)
  const bottomRef  = useRef(null)
  const fileRef    = useRef(null)
  const textareaRef = useRef(null)

  // auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  useEffect(() => { autoResize() }, [text, autoResize])

  useEffect(() => {
    if (!matchId || !profile) return

    if (demoMode) {
      const match = DEMO_MATCHES.find(m => m.id === matchId)
      if (match) setOther(match.profile)
      setMessages(DEMO_MESSAGES[matchId] || [])
      setLoading(false)
      return
    }

    loadMatch()
    loadMessages()

    const channel = supabase
      .channel(`chat-${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, payload => {
        setMessages(ms => [...ms, payload.new])
        if (payload.new.sender_id !== profile.id) markRead(payload.new.id)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [matchId, profile])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMatch = async () => {
    const { data: m } = await supabase
      .from('matches').select('couple_a, couple_b').eq('id', matchId).single()
    if (!m) return
    const otherId = m.couple_a === profile.id ? m.couple_b : m.couple_a
    const { data: p } = await supabase
      .from('profiles').select('id, couple_name, avatar_url').eq('id', otherId).single()
    setOther(p)
  }

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .not('deleted_for', 'cs', `{${profile.id}}`)
      .order('created_at', { ascending: true })

    setMessages(data || [])
    setLoading(false)

    // marquer comme lus
    const unread = (data || []).filter(m => m.sender_id !== profile.id && !m.read_at)
    if (unread.length) {
      await supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unread.map(m => m.id))
    }
  }

  const markRead = async (msgId) => {
    await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msgId)
  }

  const send = async () => {
    const content = text.trim()
    if (!content || sending) return
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
      setText('')
      setSending(false)
      return
    }

    const { error } = await supabase.from('messages').insert({
      match_id:  matchId,
      sender_id: profile.id,
      content,
    })
    if (error) toast('Erreur d\'envoi', 'error')
    setText('')
    setSending(false)
  }

  const sendPhoto = async (file) => {
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${matchId}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from('chat-photos').upload(path, file)
    if (upErr) { toast('Erreur upload photo', 'error'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('chat-photos').getPublicUrl(path)

    await supabase.from('messages').insert({
      match_id:         matchId,
      sender_id:        profile.id,
      photo_url:        publicUrl,
      photo_expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    })
    setUploading(false)
  }

  const deleteForMe = async (msgId) => {
    setMessages(ms => ms.filter(m => m.id !== msgId))
    await supabase.rpc('delete_message_for_user', { message_id: msgId, user_id: profile.id })
  }

  const unmatch = async () => {
    if (!confirm('Annuler ce match ? La conversation sera supprimée.')) return
    await supabase.from('matches').delete().eq('id', matchId)
    navigate('/matches')
    toast('Match annulé')
  }

  const appendEmoji = (emoji) => {
    setText(t => t + emoji)
    textareaRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-dvh bg-bg">
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-[rgba(201,168,76,0.2)] flex-shrink-0">
        <button onClick={() => navigate('/messages')} className="text-muted hover:text-text cursor-pointer">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>

        <div className="w-9 h-9 rounded-full bg-surface2 overflow-hidden flex-shrink-0">
          {otherProfile?.avatar_url ? (
            <img src={otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-serif text-gold/40">
              {otherProfile?.couple_name?.[0]}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{otherProfile?.couple_name}</p>
        </div>

        <button onClick={unmatch} className="text-muted hover:text-red-400 cursor-pointer" title="Annuler le match">
          <Trash2 size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-muted text-sm text-center mt-8">Commencez la conversation !</p>
        ) : (
          messages.map(m => (
            <ChatBubble
              key={m.id}
              message={m}
              isMine={m.sender_id === profile.id}
              onDelete={m.sender_id === profile.id ? () => deleteForMe(m.id) : null}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="flex-shrink-0 border-t border-[rgba(201,168,76,0.2)] bg-surface px-4 py-3">
        <div className="flex items-end gap-2 max-w-lg mx-auto">
          {/* photo */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center text-muted hover:text-gold disabled:opacity-50 transition-colors duration-150 cursor-pointer"
            aria-label="Envoyer une photo"
          >
            {uploading
              ? <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              : <Image size={18} strokeWidth={1.5} />
            }
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files[0]) { sendPhoto(e.target.files[0]); e.target.value = '' } }} />

          {/* emoji */}
          <EmojiPicker onSelect={appendEmoji} />

          {/* texte */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Votre message…"
            rows={1}
            className="flex-1 bg-surface2 border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-2.5 text-text placeholder-muted focus:outline-none focus:border-gold resize-none text-sm transition-colors duration-150 leading-relaxed"
          />

          {/* envoyer */}
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-gold flex items-center justify-center text-bg hover:bg-[#d4ae58] disabled:opacity-40 transition-colors duration-150 cursor-pointer"
            aria-label="Envoyer"
          >
            <Send size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
