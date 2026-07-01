import { useEffect, useRef, useState } from 'react'
import { Send, Image, Minus, X } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { useChatDock } from '../store/chatDock'
import { useConversation } from '../hooks/useConversation'
import ChatBubble from './ChatBubble'
import EmojiPicker from './EmojiPicker'

const iconBtn = {
  background: 'rgba(255,255,255,0.22)', border: 'none', borderRadius: 6,
  width: 24, height: 24, display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: '#fff', cursor: 'pointer', flexShrink: 0,
}
const smallBtn = {
  flexShrink: 0, width: 34, height: 34, borderRadius: 10,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(237,231,219,0.9)', border: '1px solid rgba(201,168,76,0.15)',
  color: 'rgba(201,168,76,1)', cursor: 'pointer',
}
const spinner = {
  width: 14, height: 14, border: '2px solid rgba(201,168,76,0.4)',
  borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite',
}

// Une fenêtre de chat dockée (réductible/fermable). Réutilise useConversation.
export default function DockedChat({ matchId }) {
  const profile        = useAuthStore((s) => s.profile)
  const minimized      = useChatDock((s) => !!s.minimized[matchId])
  const toggleMinimize = useChatDock((s) => s.toggleMinimize)
  const closeChat      = useChatDock((s) => s.closeChat)

  const {
    messages, otherProfile, loading, sending, uploading,
    send, sendPhoto, deleteMessage,
  } = useConversation(matchId)

  const [text, setText] = useState('')
  const bottomRef = useRef(null)
  const fileRef   = useRef(null)

  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages, minimized])

  const handleSend = () => {
    const c = text.trim()
    if (!c) return
    send(c)
    setText('')
  }

  const name   = otherProfile?.couple_name || '…'
  const avatar = otherProfile?.avatar_url

  return (
    <div style={{
      pointerEvents: 'auto',
      width: 'min(320px, calc(100vw - 24px))',
      background: 'rgba(253,250,246,0.98)',
      border: '1px solid rgba(201,168,76,0.35)',
      borderRadius: '14px 14px 0 0',
      boxShadow: '0 12px 44px rgba(0,0,0,0.20)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    }}>
      {/* header (clic = réduire/ouvrir) */}
      <div
        onClick={() => toggleMinimize(matchId)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
          cursor: 'pointer', flexShrink: 0,
          background: 'linear-gradient(135deg, #A07830, #C9A84C)',
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#EDE7DB', border: '1px solid rgba(255,255,255,0.5)' }}>
          {avatar
            ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant, serif', fontSize: 14, color: '#A07830' }}>{name[0]}</div>}
        </div>
        <span style={{ flex: 1, minWidth: 0, color: '#fff', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <button onClick={(e) => { e.stopPropagation(); toggleMinimize(matchId) }} aria-label={minimized ? 'Ouvrir' : 'Réduire'} style={iconBtn}><Minus size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); closeChat(matchId) }} aria-label="Fermer" style={iconBtn}><X size={15} /></button>
      </div>

      {!minimized && (
        <>
          {/* messages */}
          <div style={{ height: 320, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, background: '#FDFAF6' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <div style={{ ...spinner, width: 18, height: 18 }} />
              </div>
            ) : messages.length === 0 ? (
              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, letterSpacing: '0.12em', color: 'rgba(201,168,76,1)', textTransform: 'uppercase' }}>Dites bonjour…</p>
            ) : messages.map((m) => (
              <ChatBubble
                key={m.id}
                message={m}
                isMine={m.sender_id === profile?.id}
                onDelete={m.sender_id === profile?.id ? () => deleteMessage(m.id) : null}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* input */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: 8, borderTop: '1px solid rgba(201,168,76,0.2)', flexShrink: 0 }}>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Photo" style={smallBtn}>
              {uploading ? <div style={spinner} /> : <Image size={16} strokeWidth={1.5} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files[0]) { sendPhoto(e.target.files[0]); e.target.value = '' } }} />

            <EmojiPicker onSelect={(emo) => setText((t) => t + emo)} />

            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Message…"
              disabled={sending}
              style={{ flex: 1, minWidth: 0, background: 'rgba(245,240,232,0.9)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 12, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#1C1814' }}
            />

            <button onClick={handleSend} disabled={sending || !text.trim()} aria-label="Envoyer" className="btn-gold"
              style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: sending || !text.trim() ? 'default' : 'pointer', opacity: sending || !text.trim() ? 0.35 : 1 }}>
              <Send size={15} strokeWidth={2} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
