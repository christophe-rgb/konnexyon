import { useEffect, useRef, useState } from 'react'
import { Send, ArrowLeft, Bot, Trash2, Eraser } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { confirm } from './ConfirmDialog'

// Boîte des bots (admin) : voir les messages reçus par les bots et répondre
// à leur place.
export default function BotInbox() {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [active,  setActive]  = useState(null)  // thread ouvert
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const loadThreads = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_bot_threads')
    if (error) console.error('admin_bot_threads:', error.message)
    setThreads(data || [])
    setLoading(false)
  }
  useEffect(() => { loadThreads() }, [])

  const loadMessages = async (matchId) => {
    const { data } = await supabase.rpc('admin_bot_messages', { p_match_id: matchId })
    setMessages(data || [])
    setTimeout(() => bottomRef.current?.scrollIntoView(), 40)
  }

  const openThread = async (t) => {
    setActive(t)
    await loadMessages(t.match_id)
    loadThreads() // rafraîchit les compteurs non-lus
  }

  const send = async () => {
    const c = text.trim()
    if (!c || !active || sending) return
    setSending(true)
    const { error } = await supabase.rpc('admin_send_as_bot', { p_match_id: active.match_id, p_content: c })
    setSending(false)
    if (error) { console.error('admin_send_as_bot:', error.message); return }
    setText('')
    await loadMessages(active.match_id)
  }

  const resetThread = async () => {
    if (!active) return
    const ok = await confirm({ title: 'Vider la conversation', message: `Effacer tous les messages avec ${active.client_name} ? La connexion est conservée.`, confirmLabel: 'Vider', danger: true })
    if (!ok) return
    const { error } = await supabase.rpc('admin_reset_bot_thread', { p_match_id: active.match_id })
    if (error) { console.error('admin_reset_bot_thread:', error.message); return }
    await loadMessages(active.match_id)
    loadThreads()
  }

  const deleteThread = async () => {
    if (!active) return
    const ok = await confirm({ title: 'Supprimer la conversation', message: `Supprimer définitivement la conversation avec ${active.client_name} (messages + connexion) ?`, confirmLabel: 'Supprimer', danger: true })
    if (!ok) return
    const { error } = await supabase.rpc('admin_delete_bot_thread', { p_match_id: active.match_id })
    if (error) { console.error('admin_delete_bot_thread:', error.message); return }
    setActive(null)
    loadThreads()
  }

  // ── Vue conversation ──
  if (active) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 220px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={18} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {active.client_name} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>écrit à</span> {active.bot_name}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(201,168,76,0.9)', letterSpacing: '0.08em' }}>
              <Bot size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} /> Tu réponds en tant que {active.bot_name}
            </p>
          </div>
          <button onClick={resetThread} aria-label="Vider la conversation" title="Vider (garder la connexion)"
            style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
            <Eraser size={15} strokeWidth={1.6} />
          </button>
          <button onClick={deleteThread} aria-label="Supprimer la conversation" title="Supprimer la conversation"
            style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#EF4444' }}>
            <Trash2 size={15} strokeWidth={1.6} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(0,0,0,0.15)' }}>
          {messages.length === 0 ? (
            <p style={{ textAlign: 'center', marginTop: 30, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Aucun message.</p>
          ) : messages.map(m => {
            const fromBot = m.sender_id === active.bot_id
            return (
              <div key={m.id} style={{ alignSelf: fromBot ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                {m.content && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 14, fontSize: 13, lineHeight: 1.4,
                    background: fromBot ? 'linear-gradient(135deg,#A07830,#C9A84C)' : 'rgba(255,255,255,0.08)',
                    color: fromBot ? '#0D0D0D' : '#fff',
                    borderBottomRightRadius: fromBot ? 4 : 14, borderBottomLeftRadius: fromBot ? 14 : 4,
                  }}>{m.content}</div>
                )}
                {m.photo_url && (
                  <img src={m.photo_url} alt="" style={{ maxWidth: 180, borderRadius: 12, marginTop: 4 }} />
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`Répondre en tant que ${active.bot_name}…`}
            style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '9px 13px', color: '#fff', fontSize: 13, outline: 'none' }}
          />
          <button onClick={send} disabled={sending || !text.trim()} aria-label="Envoyer"
            style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending || !text.trim() ? 'default' : 'pointer', opacity: sending || !text.trim() ? 0.4 : 1, background: 'linear-gradient(135deg,#A07830,#C9A84C)', color: '#0D0D0D' }}>
            <Send size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    )
  }

  // ── Liste des conversations ──
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0' }}><div style={{ width: 24, height: 24, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', margin: '0 auto' }} /></div>
  }
  if (threads.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Bot size={40} strokeWidth={1} style={{ color: 'rgba(201,168,76,0.3)', margin: '0 auto 12px' }} />
        <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.4rem', color: 'rgba(255,255,255,0.3)' }}>Aucune conversation avec les bots</p>
      </div>
    )
  }
  const pending = threads.filter(t => t.unread_from_client > 0)
  const totalPending = pending.reduce((n, t) => n + (t.unread_from_client || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Boîte : messages en attente de réponse */}
      <div style={{
        borderRadius: 16, padding: 14, marginBottom: 4,
        background: pending.length ? 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(201,168,76,0.10))' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${pending.length ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.06)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: pending.length ? 10 : 0 }}>
          <span style={{ fontSize: 15 }} aria-hidden>📨</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
            Messages en attente
          </p>
          <span style={{
            marginLeft: 'auto', minWidth: 22, height: 22, borderRadius: 999, padding: '0 7px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: pending.length ? '#EF4444' : 'rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 12, fontWeight: 700,
          }}>{totalPending}</span>
        </div>
        {pending.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
            Aucun message en attente — tu es à jour ✓
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pending.map(t => (
              <button key={`p-${t.match_id}`} onClick={() => openThread(t)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#2a2620' }}>
                  {t.client_avatar ? <img src={t.client_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(201,168,76,0.7)', fontFamily: 'Cormorant, serif', fontSize: 15 }}>{t.client_name?.[0]}</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.client_name} <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 400 }}>→ {t.bot_name}</span>
                  </p>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.last_message || 'Nouveau message'}
                  </p>
                </div>
                <span style={{ flexShrink: 0, minWidth: 20, height: 20, borderRadius: 999, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                  {t.unread_from_client}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {threads.map(t => (
        <button key={t.match_id} onClick={() => openThread(t)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, cursor: 'pointer', textAlign: 'left', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#2a2620' }}>
            {t.client_avatar ? <img src={t.client_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(201,168,76,0.7)', fontFamily: 'Cormorant, serif', fontSize: 18 }}>{t.client_name?.[0]}</div>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.client_name} <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 400 }}>→ {t.bot_name}</span>
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.last_message || 'Nouvelle connexion'}
            </p>
          </div>
          {t.unread_from_client > 0 && (
            <span style={{ flexShrink: 0, minWidth: 20, height: 20, borderRadius: 999, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
              {t.unread_from_client}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
