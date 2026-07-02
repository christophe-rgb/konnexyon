import { useEffect, useRef, useState } from 'react'
import { Music2, Pause, Play, SkipForward, X } from 'lucide-react'
import { safeGet, safeSet } from '../lib/storage'
import { supabase } from '../lib/supabase'

// Lecteur de musique de fond (chansons hébergées dans public/music/).
// Les navigateurs bloquent l'autoplay avec son : on démarre donc au TOUT
// premier geste de l'utilisateur (clic/tap/touche). Boucle sur la playlist,
// bouton lecture/pause + suivant + fermer. La préférence « coupé » est
// mémorisée (localStorage) pour ne pas relancer à chaque visite.
export default function MusicPlayer() {
  const [tracks,  setTracks]  = useState([])
  const [idx,     setIdx]     = useState(0)
  const [playing, setPlaying] = useState(false)
  const [closed,  setClosed]  = useState(() => safeGet('music_off') === '1')
  const audioRef = useRef(null)

  // charge la playlist : d'abord les pistes gérées en admin (get_music),
  // sinon repli sur le fichier statique public/music/playlist.json.
  useEffect(() => {
    let cancelled = false
    const fromJson = () =>
      fetch('/music/playlist.json')
        .then(r => (r.ok ? r.json() : []))
        .then(d => { if (!cancelled) setTracks(Array.isArray(d) ? d.filter(t => t && t.src) : []) })
        .catch(() => {})
    supabase.rpc('get_music')
      .then(({ data, error }) => {
        if (cancelled) return
        const list = (!error && Array.isArray(data)) ? data.filter(t => t && t.url) : []
        if (list.length > 0) setTracks(list.map(t => ({ title: t.title, src: t.url })))
        else fromJson()
      })
      .catch(() => { if (!cancelled) fromJson() })
    return () => { cancelled = true }
  }, [])

  // démarre au 1er geste utilisateur (contourne le blocage autoplay)
  useEffect(() => {
    if (closed || tracks.length === 0) return
    let done = false
    const start = () => {
      if (done) return
      done = true
      audioRef.current?.play().then(() => setPlaying(true)).catch(() => {})
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      window.removeEventListener('touchstart', start)
    }
    window.addEventListener('pointerdown', start, { once: false })
    window.addEventListener('keydown', start)
    window.addEventListener('touchstart', start)
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      window.removeEventListener('touchstart', start)
    }
  }, [closed, tracks])

  // quand la piste change, enchaîne la lecture si on écoutait déjà
  useEffect(() => {
    if (playing) audioRef.current?.play().catch(() => {})
  }, [idx]) // eslint-disable-line react-hooks/exhaustive-deps

  if (closed || tracks.length === 0) return null
  const track = tracks[idx] || tracks[0]
  const next  = () => setIdx(i => (i + 1) % tracks.length)

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else a.play().then(() => setPlaying(true)).catch(() => {})
  }
  const close = () => {
    audioRef.current?.pause()
    setPlaying(false)
    setClosed(true)
    safeSet('music_off', '1')
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={track.src}
        onEnded={next}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        preload="auto"
      />
      <div style={{
        position: 'fixed', left: 12, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
        zIndex: 900, display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 999,
        background: 'rgba(10,10,10,0.82)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(212,175,55,0.4)', boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
        maxWidth: 240,
      }}>
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Lecture'} style={btn}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <Music2 size={13} style={{ color: '#F4D875', flexShrink: 0 }} />
        <span style={{
          fontSize: 12, color: '#F0EDE8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxWidth: 120, fontFamily: 'Inter, system-ui, sans-serif',
        }}>{track.title || 'Konnexyon'}</span>
        <button onClick={next} aria-label="Suivant" style={btn}><SkipForward size={14} /></button>
        <button onClick={close} aria-label="Couper la musique" style={{ ...btn, color: 'rgba(240,237,232,0.5)' }}><X size={14} /></button>
      </div>
    </>
  )
}

const btn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
  background: 'transparent', border: 'none', cursor: 'pointer', color: '#F4D875', padding: 0,
}
