import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { confirm } from './ConfirmDialog'
import { toast } from './Toast'
import { Music2, Play, Pause, Trash2, ChevronUp, ChevronDown, Plus } from 'lucide-react'

// Onglet admin "Musique" : gère la playlist de fond (upload MP3, (dés)activer,
// réordonner, supprimer). Les MP3 sont hébergés dans le bucket public 'music'
// et enregistrés via les RPC admin_* (SECURITY DEFINER, rôle admin vérifié en SQL).
export default function MusicAdmin() {
  const user = useAuthStore(s => s.user)
  const [tracks,   setTracks]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [uploading, setUploading] = useState(false)
  const [playingId, setPlayingId] = useState(null) // aperçu : une seule piste à la fois
  const fileRef  = useRef(null)
  const audioRef = useRef(null)

  const load = async () => {
    const { data, error } = await supabase.rpc('admin_list_music')
    if (error) console.error('admin_list_music:', error.message)
    setTracks(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // stoppe l'aperçu au démontage
  useEffect(() => () => { audioRef.current?.pause() }, [])

  // ── Upload d'un nouveau morceau
  const pick = () => fileRef.current?.click()

  // Upload d'UN fichier (renvoie true si ok). Toast uniquement en cas d'erreur.
  const uploadOne = async (file) => {
    if (!file || !user) return false
    if (!file.type.startsWith('audio/')) { toast(`« ${file.name} » ignoré (pas un audio)`, 'error'); return false }
    if (file.size > 25 * 1024 * 1024) { toast(`« ${file.name} » trop lourd (max 25 Mo)`, 'error'); return false }
    try {
      const clean = file.name.replace(/[^a-zA-Z0-9]/g, '-')
      const rand  = Math.random().toString(36).slice(2, 7)
      const path  = `${user.id}/${Date.now()}-${rand}-${clean}`
      const { error: upErr } = await supabase.storage
        .from('music').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { toast(`Erreur upload « ${file.name} » : ${upErr.message}`, 'error'); return false }
      const { data: { publicUrl } } = supabase.storage.from('music').getPublicUrl(path)
      const title = file.name.replace(/\.[^.]+$/, '') || 'Sans titre'
      const { error: rpcErr } = await supabase.rpc('admin_add_music', { p_title: title, p_url: publicUrl })
      if (rpcErr) { toast(`Erreur « ${file.name} » : ${rpcErr.message}`, 'error'); return false }
      return true
    } catch {
      toast(`Erreur inattendue sur « ${file.name} »`, 'error')
      return false
    }
  }

  // Upload de PLUSIEURS fichiers d'un coup.
  const upload = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length || !user) return
    setUploading(true)
    let ok = 0
    try {
      for (const f of files) { if (await uploadOne(f)) ok++ }
      if (ok > 0) { toast(ok > 1 ? `${ok} chansons ajoutées ✓` : 'Chanson ajoutée ✓'); await load() }
    } finally {
      setUploading(false)
    }
  }

  // ── Aperçu lecture/pause (une seule piste)
  const togglePreview = (t) => {
    const a = audioRef.current
    if (!a) return
    if (playingId === t.id) {
      a.pause()
      setPlayingId(null)
    } else {
      a.src = t.url
      a.play().then(() => setPlayingId(t.id)).catch(() => toast('Lecture impossible', 'error'))
    }
  }

  // ── Renommer (pas de RPC dédiée → update direct, autorisé par la policy admin)
  const rename = async (t, title) => {
    const next = (title || '').trim()
    if (!next || next === t.title) { setTracks(prev => prev.map(x => x.id === t.id ? { ...x, title: t.title } : x)); return }
    const { error } = await supabase.from('music_tracks').update({ title: next }).eq('id', t.id)
    if (error) { toast('Renommage impossible', 'error'); console.error(error.message); load(); return }
    setTracks(prev => prev.map(x => x.id === t.id ? { ...x, title: next } : x))
    toast('Titre mis à jour ✓')
  }

  // ── (Dés)activer
  const toggleActive = async (t) => {
    const { error } = await supabase.rpc('admin_set_music_active', { p_id: t.id, p_active: !t.active })
    if (error) { toast('Action impossible', 'error'); console.error(error.message); return }
    load()
  }

  // ── Réordonner : échange la position avec la piste voisine
  const move = async (index, dir) => {
    const target = index + dir
    if (target < 0 || target >= tracks.length) return
    const a = tracks[index], b = tracks[target]
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.rpc('admin_set_music_position', { p_id: a.id, p_position: b.position }),
      supabase.rpc('admin_set_music_position', { p_id: b.id, p_position: a.position }),
    ])
    if (e1 || e2) { toast('Réordonnancement impossible', 'error'); console.error(e1?.message || e2?.message) }
    load()
  }

  // ── Supprimer
  const remove = async (t) => {
    const ok = await confirm({
      title: 'Supprimer la chanson',
      message: `Supprimer « ${t.title} » de la playlist ?`,
      confirmLabel: 'Supprimer', danger: true,
    })
    if (!ok) return
    if (playingId === t.id) { audioRef.current?.pause(); setPlayingId(null) }
    const { error } = await supabase.rpc('admin_delete_music', { p_id: t.id })
    if (error) { toast('Suppression impossible', 'error'); console.error(error.message); return }
    toast('Chanson supprimée')
    load()
  }

  return (
    <div>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} preload="none" />

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          {tracks.length} chanson{tracks.length > 1 ? 's' : ''} · {tracks.filter(t => t.active).length} active{tracks.filter(t => t.active).length > 1 ? 's' : ''}
        </span>
        <button
          onClick={pick}
          disabled={uploading}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 15px', borderRadius: 11, cursor: uploading ? 'default' : 'pointer',
            background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)',
            color: '#C9A84C', fontSize: 12.5, fontWeight: 600, opacity: uploading ? 0.7 : 1,
          }}
        >
          {uploading
            ? <><span style={{ width: 13, height: 13, border: '2px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.7s linear infinite' }} /> Envoi…</>
            : <><Plus size={14} strokeWidth={2} /> Ajouter une chanson</>}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file" accept="audio/*" multiple style={{ display: 'none' }}
        onChange={e => { const fs = e.target.files; e.target.value = ''; upload(fs) }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 24, height: 24, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : tracks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Music2 size={38} strokeWidth={1} style={{ color: 'rgba(201,168,76,0.3)', margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', color: 'rgba(255,255,255,0.3)' }}>
            Aucune chanson — ajoutez vos morceaux
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tracks.map((t, i) => {
            const isPlaying = playingId === t.id
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: '10px 14px', opacity: t.active ? 1 : 0.55,
              }}>
                {/* aperçu lecture/pause */}
                <button
                  onClick={() => togglePreview(t)}
                  aria-label={isPlaying ? 'Pause' : 'Écouter'}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
                    background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', padding: 0,
                  }}
                >
                  {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                </button>

                {/* titre éditable */}
                <input
                  defaultValue={t.title}
                  key={t.title}
                  onBlur={e => rename(t, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                  style={{
                    flex: 1, minWidth: 140, background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9,
                    padding: '8px 11px', color: '#F0EDE8', fontSize: 13, outline: 'none',
                  }}
                />

                {/* badge + toggle actif */}
                <button
                  onClick={() => toggleActive(t)}
                  style={{
                    flexShrink: 0, fontSize: 10, padding: '5px 11px', borderRadius: 99, cursor: 'pointer',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    background: t.active ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${t.active ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.12)'}`,
                    color: t.active ? '#4ade80' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {t.active ? 'Active' : 'Inactive'}
                </button>

                {/* réordonner */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter" style={arrowBtn(i === 0)}>
                    <ChevronUp size={15} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === tracks.length - 1} aria-label="Descendre" style={arrowBtn(i === tracks.length - 1)}>
                    <ChevronDown size={15} />
                  </button>
                </div>

                {/* supprimer */}
                <button onClick={() => remove(t)} aria-label="Supprimer" style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
                  background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: 0,
                }}>
                  <Trash2 size={14} strokeWidth={1.6} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const arrowBtn = (disabled) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, borderRadius: 8, padding: 0,
  background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
  color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
  cursor: disabled ? 'default' : 'pointer',
})
