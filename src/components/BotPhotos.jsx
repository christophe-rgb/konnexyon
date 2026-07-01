import { useEffect, useRef, useState } from 'react'
import { Camera, Bot } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { toast } from './Toast'

// Admin : définir la photo de chaque bot en un clic.
// L'upload se fait dans le dossier de l'admin (autorisé par la RLS storage),
// puis l'URL publique est enregistrée sur le bot via la RPC admin_set_bot_avatar.
export default function BotPhotos() {
  const user = useAuthStore(s => s.user)
  const [bots, setBots] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const fileRefs = useRef({})

  const load = async () => {
    setLoading(true)
    // Les bots sont des profils publics → lecture normale (pas de RPC nécessaire).
    const { data, error } = await supabase
      .from('profiles')
      .select('id, couple_name, avatar_url, bio')
      .eq('is_bot', true)
      .order('couple_name')
    if (error) console.error('load bots:', error.message)
    setBots(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const pick = (id) => fileRefs.current[id]?.click()

  const upload = async (bot, file) => {
    if (!file || !user) return
    if (!file.type.startsWith('image/')) { toast('Choisissez une image.', 'error'); return }
    if (file.size > 8 * 1024 * 1024) { toast('Image trop lourde (max 8 Mo).', 'error'); return }
    setBusyId(bot.id)
    try {
      const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase()
      // upload dans le dossier de l'admin (autorisé), nom unique par bot
      const path = `${user.id}/bot-${bot.id}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { toast(`Erreur upload : ${upErr.message}`, 'error'); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      const { error: rpcErr } = await supabase.rpc('admin_set_bot_avatar', { p_bot_id: bot.id, p_url: url })
      if (rpcErr) { toast(`Erreur : ${rpcErr.message}`, 'error'); return }
      setBots(prev => prev.map(b => b.id === bot.id ? { ...b, avatar_url: url } : b))
      toast(`Photo de ${bot.couple_name} mise à jour ✓`)
    } catch (e) {
      toast('Erreur inattendue lors de l\'upload', 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0' }}><div style={{ width: 24, height: 24, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', margin: '0 auto' }} /></div>
  }
  if (bots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Bot size={40} strokeWidth={1} style={{ color: 'rgba(201,168,76,0.3)', margin: '0 auto 12px' }} />
        <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.4rem', color: 'rgba(255,255,255,0.3)' }}>Aucun bot pour le moment</p>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 4 }}>
        Clique sur une photo pour la changer. La photo est visible immédiatement sur le profil du bot.
      </p>
      {bots.map(bot => (
        <div key={bot.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => pick(bot.id)}
            disabled={busyId === bot.id}
            aria-label={`Changer la photo de ${bot.couple_name}`}
            style={{
              position: 'relative', width: 56, height: 56, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
              cursor: busyId === bot.id ? 'default' : 'pointer', padding: 0,
              background: '#2a2620', border: '1px solid rgba(201,168,76,0.25)',
            }}
          >
            {bot.avatar_url
              ? <img src={bot.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(201,168,76,0.7)', fontFamily: 'Cormorant, serif', fontSize: 22 }}>{bot.couple_name?.[0] || '∞'}</div>}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', opacity: busyId === bot.id ? 1 : 0.001 }}>
              {busyId === bot.id
                ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'rotateX 0.7s linear infinite' }} />
                : <Camera size={16} color="#fff" />}
            </div>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{bot.couple_name}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bot.bio}</p>
          </div>
          <button
            onClick={() => pick(bot.id)}
            disabled={busyId === bot.id}
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, cursor: busyId === bot.id ? 'default' : 'pointer', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', fontSize: 12 }}
          >
            <Camera size={13} strokeWidth={1.8} /> Photo
          </button>
          <input
            ref={el => (fileRefs.current[bot.id] = el)}
            type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; upload(bot, f) }}
          />
        </div>
      ))}
    </div>
  )
}
