import { useEffect, useRef, useState } from 'react'
import { Pause, Play, SkipForward, X } from 'lucide-react'
import { safeGet, safeSet } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

// hauteurs de repos des barres du vumètre (profil « table de mixage » nerveux)
const BARS = [0.4, 0.7, 1, 0.55, 0.85, 0.45, 0.95, 0.6, 0.8, 0.5, 1, 0.65, 0.9, 0.42, 0.75, 0.58]

// Lecteur de musique de fond, style « club » : vumètre doré animé + halo pulsé.
// - Démarre au 1er geste utilisateur (contourne le blocage autoplay), une fois
//   le visiteur CONNECTÉ. Piste + position mémorisées PAR COMPTE (chacun reprend
//   exactement à son point d'arrêt).
// - Le vumètre est purement visuel (CSS) : il ne touche jamais au flux audio,
//   donc le son n'est jamais compromis.
export default function MusicPlayer() {
  const user = useAuthStore(s => s.user)
  const uid  = user?.id

  const [tracks,  setTracks]  = useState([])
  const [idx,     setIdx]     = useState(0)
  const [playing, setPlaying] = useState(false)
  const [closed,  setClosed]  = useState(true) // fermé tant qu'on ne sait pas qui est connecté
  const [ready,   setReady]   = useState(false)
  const audioRef = useRef(null)
  const resumeRef   = useRef({ idx: 0, pos: 0, applied: true })
  const lastSaveRef = useRef(0)

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

  // ── ATTENDRE LA CONNEXION : charge SA piste + SA position ─────
  useEffect(() => {
    if (!uid) { setReady(false); setClosed(true); setPlaying(false); return }
    const savedIdx = Math.max(0, Number(safeGet(`music_idx:${uid}`)) || 0)
    const savedPos = Math.max(0, Number(safeGet(`music_pos:${uid}`)) || 0)
    resumeRef.current = { idx: savedIdx, pos: savedPos, applied: false }
    lastSaveRef.current = 0
    setIdx(savedIdx)
    setClosed(safeGet(`music_off:${uid}`) === '1')
    setReady(true)
  }, [uid])

  // borne l'index quand la playlist est connue (playlist raccourcie entre 2 visites)
  useEffect(() => {
    if (tracks.length === 0) return
    setIdx(i => (i < tracks.length ? i : 0))
  }, [tracks])

  // mémorise la piste + la position PAR COMPTE
  const persist = (i, pos) => {
    if (!uid) return
    safeSet(`music_idx:${uid}`, String(i))
    safeSet(`music_pos:${uid}`, String(Math.max(0, Math.floor(pos || 0))))
  }

  const onTimeUpdate = () => {
    const a = audioRef.current
    if (!a) return
    if (Math.abs(a.currentTime - lastSaveRef.current) >= 3) {
      lastSaveRef.current = a.currentTime
      persist(idx, a.currentTime)
    }
  }

  const onLoadedMetadata = () => {
    const a = audioRef.current
    if (!a) return
    const r = resumeRef.current
    if (!r.applied && idx === r.idx && r.pos > 0 && r.pos < a.duration - 1) {
      a.currentTime = r.pos
    }
    r.applied = true
  }

  // sauvegarde aussi à la fermeture / passage en arrière-plan
  useEffect(() => {
    const save = () => { const a = audioRef.current; if (a) persist(idx, a.currentTime) }
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', save)
    return () => {
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', save)
    }
  }, [idx, uid]) // eslint-disable-line react-hooks/exhaustive-deps

  // Démarre la lecture une fois prêt (tentative immédiate + secours au 1er geste).
  useEffect(() => {
    if (!ready || closed || tracks.length === 0) return
    let done = false
    const disarm = () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      window.removeEventListener('touchstart', start)
    }
    function start() {
      if (done) return
      done = true
      audioRef.current?.play().then(() => { setPlaying(true); disarm() }).catch(() => { done = false })
    }
    audioRef.current?.play().then(() => setPlaying(true)).catch(() => {
      window.addEventListener('pointerdown', start)
      window.addEventListener('keydown', start)
      window.addEventListener('touchstart', start)
    })
    return disarm
  }, [ready, closed, tracks])

  useEffect(() => {
    if (playing) audioRef.current?.play().catch(() => {})
  }, [idx]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !uid || closed || tracks.length === 0) return null
  const track = tracks[idx] || tracks[0]

  const next = () => setIdx(i => {
    const n = (i + 1) % tracks.length
    resumeRef.current.applied = true
    lastSaveRef.current = 0
    persist(n, 0)
    return n
  })

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else a.play().then(() => setPlaying(true)).catch(() => {})
  }
  const close = () => {
    const a = audioRef.current
    if (a) persist(idx, a.currentTime)
    a?.pause()
    setPlaying(false)
    setClosed(true)
    if (uid) safeSet(`music_off:${uid}`, '1')
  }

  return (
    <>
      <style>{`
        @keyframes kx-eq       { 0% { transform: scaleY(0.22) } 100% { transform: scaleY(1) } }
        @keyframes kx-bandglow { 0%,100% { box-shadow: 0 -4px 22px rgba(212,175,55,.14) }
                                 50%      { box-shadow: 0 -4px 30px rgba(212,175,55,.30) } }
      `}</style>
      <audio
        ref={audioRef}
        src={track.src}
        onEnded={next}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        preload="auto"
      />
      {/* Bande musique pleine largeur (au-dessus de la barre de navigation) */}
      <div style={{
        position: 'fixed', left: 0, right: 0,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 66px)',
        zIndex: 900, display: 'flex', alignItems: 'center', gap: 12,
        height: 52, padding: '0 14px',
        background: 'linear-gradient(180deg, rgba(16,13,7,0.96), rgba(8,8,8,0.97))',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderTop: '1px solid rgba(212,175,55,0.5)',
        boxShadow: '0 -4px 22px rgba(0,0,0,0.4)',
        animation: playing ? 'kx-bandglow 2.6s ease-in-out infinite' : 'none',
      }}>
        {/* ── GAUCHE : vumètre nerveux ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height: 26, flexShrink: 0 }} aria-hidden="true">
          {BARS.map((h, i) => (
            <span
              key={i}
              style={{
                width: 3.5, height: '100%', borderRadius: 2,
                background: 'linear-gradient(180deg,#FBEBB0 0%,#F0D276 40%,#C9A84C 100%)',
                transformOrigin: 'bottom',
                transform: `scaleY(${playing ? h : 0.16})`,
                animation: playing
                  ? `kx-eq ${(0.24 + (i % 4) * 0.06 + h * 0.12).toFixed(2)}s ease-in-out ${(i * 0.035).toFixed(2)}s infinite alternate`
                  : 'none',
                boxShadow: playing ? '0 0 7px rgba(212,175,55,0.5)' : 'none',
              }}
            />
          ))}
        </div>

        {/* ── CENTRE : espace libre pour la suite ── */}
        <div style={{ flex: 1 }} />

        {/* ── DROITE : titre + play + fermer ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'right' }}>
            <span style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.72)', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.3 }}>
              En lecture
            </span>
            <span style={{
              fontSize: 13, color: '#F0EDE8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: 160, fontFamily: 'Inter, system-ui, sans-serif',
            }}>{track.title || 'Konnexyon'}</span>
          </div>

          {/* Lecture / pause — pastille dorée lumineuse */}
          <button onClick={toggle} aria-label={playing ? 'Pause' : 'Lecture'} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', padding: 0,
            background: playing ? 'linear-gradient(135deg,#F7E39A,#C9A84C)' : 'rgba(212,175,55,0.14)',
            border: '1px solid rgba(212,175,55,0.65)',
            color: playing ? '#1A1206' : '#F4D875',
            boxShadow: playing ? '0 0 14px rgba(212,175,55,0.5)' : 'none',
          }}>
            {playing ? <Pause size={16} strokeWidth={2.5} /> : <Play size={16} strokeWidth={2.5} />}
          </button>

          {/* Suivant */}
          <button onClick={next} aria-label="Chanson suivante" style={btn}><SkipForward size={16} /></button>

          {/* Fermer */}
          <button onClick={close} aria-label="Couper la musique" style={{ ...btn, color: 'rgba(240,237,232,0.5)' }}><X size={15} /></button>
        </div>
      </div>
    </>
  )
}

const btn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
  background: 'transparent', border: 'none', cursor: 'pointer', color: '#F4D875', padding: 0,
}
