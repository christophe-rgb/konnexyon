import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useConversation } from '../hooks/useConversation'
import ChatBubble from '../components/ChatBubble'
import EmojiPicker from '../components/EmojiPicker'
import { ArrowLeft, Send, Image, Trash2 } from 'lucide-react'

export default function Conversation() {
  const { matchId } = useParams()
  const profile     = useAuthStore(s => s.profile)
  const navigate    = useNavigate()

  const {
    messages, otherProfile, loading, loadingMore, hasMore,
    sending, uploading,
    send, sendPhoto, deleteMessage, deleteMatch, loadMore,
  } = useConversation(matchId)

  const [text, setText] = useState('')

  const bottomRef   = useRef(null)
  const scrollRef   = useRef(null)
  const fileRef     = useRef(null)
  const textareaRef = useRef(null)

  // auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  useEffect(() => { autoResize() }, [text, autoResize])

  // Scroll vers le bas à l'ouverture et à la réception d'un nouveau message
  const prevMsgCountRef = useRef(0)
  useEffect(() => {
    const prevCount = prevMsgCountRef.current
    const newCount  = messages.length
    prevMsgCountRef.current = newCount
    if (prevCount === 0 || newCount === prevCount + 1) {
      bottomRef.current?.scrollIntoView({ behavior: prevCount === 0 ? 'auto' : 'smooth' })
    }
  }, [messages])

  // Restauration du scroll après "charger plus"
  const loadMoreMessages = async () => {
    const container = scrollRef.current
    const prevScrollHeight = container?.scrollHeight || 0
    await loadMore()
    requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight - prevScrollHeight
    })
  }

  const handleSend = () => {
    const content = text.trim()
    if (!content) return
    send(content)
    setText('')
  }

  const appendEmoji = (emoji) => {
    setText(t => t + emoji)
    textareaRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-dvh bg-bg">
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', flexShrink: 0,
        background: 'rgba(253,250,246,0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(201,168,76,0.25)',
      }}>
        <button className="erb-btn"
          onClick={() => navigate('/messages')}
          aria-label="Retour"
          style={{
            width: 38, height: 38, borderRadius: '12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(237,231,219,0.8)', border: '1px solid rgba(201,168,76,0.1)',
            color: 'rgba(28,24,20,1)', cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#C9A84C'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(28,24,20,0.9)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)'; }}
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>

        <div style={{ width: 38, height: 38, borderRadius: '12px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(201,168,76,0.1)', background: '#EDE7DB' }}>
          {otherProfile?.avatar_url ? (
            <img src={otherProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant, serif', fontSize: '18px', color: 'rgba(201,168,76,1)' }}>
              {otherProfile?.couple_name?.[0]}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.1rem', fontWeight: 600, color: '#1C1814', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {otherProfile?.couple_name}
          </p>
          <p style={{ fontSize: '10px', color: 'rgba(201,168,76,1)', letterSpacing: '0.1em' }}>
            ∞ connectés
          </p>
        </div>

        <button className="erb-btn"
          onClick={deleteMatch}
          aria-label="Annuler la connexion"
          style={{
            width: 38, height: 38, borderRadius: '12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(237,231,219,0.8)', border: '1px solid rgba(239,68,68,0.12)',
            color: 'rgba(239,68,68,0.4)', cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.8)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.4)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.12)'; }}
        >
          <Trash2 size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {!loading && hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '8px' }}>
            <button
              onClick={loadMoreMessages}
              disabled={loadingMore}
              style={{
                padding: '6px 16px', borderRadius: '20px', fontSize: '12px',
                fontFamily: 'inherit', letterSpacing: '0.05em',
                background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)',
                color: 'rgba(201,168,76,1)', cursor: loadingMore ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                opacity: loadingMore ? 0.6 : 1, transition: 'all 0.2s',
              }}
            >
              {loadingMore
                ? <><div style={{ width: 12, height: 12, border: '2px solid rgba(201,168,76,0.4)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite' }} /> Chargement…</>
                : 'Voir les messages précédents'
              }
            </button>
          </div>
        )}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 22, height: 22, border: '2px solid rgba(201,168,76,0.4)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(201,168,76,1)', textTransform: 'uppercase' }}>
              ∞ · La connexion commence ici · ∞
            </p>
          </div>
        ) : (
          messages.map(m => (
            <ChatBubble
              key={m.id}
              message={m}
              isMine={m.sender_id === profile.id}
              onDelete={m.sender_id === profile.id ? () => deleteMessage(m.id) : null}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid rgba(201,168,76,0.25)',
        background: 'rgba(253,250,246,0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', maxWidth: '640px', margin: '0 auto' }}>
          {/* photo */}
          <button className="erb-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Envoyer une photo"
            style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(237,231,219,0.9)', border: '1px solid rgba(201,168,76,0.1)',
              color: 'rgba(201,168,76,1)', cursor: 'pointer', transition: 'all 0.2s',
              opacity: uploading ? 0.5 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)'; e.currentTarget.style.background = 'rgba(201,168,76,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)'; e.currentTarget.style.background = 'rgba(237,231,219,0.9)'; }}
          >
            {uploading
              ? <div style={{ width: 14, height: 14, border: '2px solid rgba(201,168,76,0.4)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite' }} />
              : <Image size={17} strokeWidth={1.5} />
            }
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) { sendPhoto(e.target.files[0]); e.target.value = '' } }} />

          {/* emoji */}
          <EmojiPicker onSelect={appendEmoji} />

          {/* texte */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Votre message…"
            rows={1}
            disabled={sending}
            style={{
              flex: 1,
              background: 'rgba(245,240,232,0.9)',
              border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: '14px',
              padding: '10px 16px',
              color: '#1C1814',
              fontSize: '14px',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5,
              transition: 'border-color 0.2s',
              fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
          />

          {/* envoyer */}
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            aria-label="Envoyer"
            className="btn-gold"
            style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: sending || !text.trim() ? 'default' : 'pointer',
              opacity: sending || !text.trim() ? 0.35 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
