import { useEffect, useRef, useState } from 'react'
import { Music2, Pause, Play, SkipForward, X } from 'lucide-react'
import { safeGet, safeSet } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

// Lecteur de musique de fond (chansons hébergées dans le bucket 'music').
// - Les navigateurs bloquent l'autoplay avec son : on démarre au TOUT premier
//   geste de l'utilisateur (clic/tap/touche).
// - Les pistes s'enchaînent l'une après l'autre (pas de boucle sur une seule)
//   puis reprennent au début de la playlist.
// - On ATTEND que le visiteur soit CONNECTÉ : la piste + la position sont
//   mémorisées PAR COMPTE (localStorage, clé suffixée par l'id utilisateur).
//   Ainsi chaque personne reprend EXACTEMENT à son propre point d'arrêt, même
//   si un autre compte a écouté sur le même appareil.
export default function MusicPlayer() {
  const user = useAuthStore(s => s.user)
  const uid  = user?.id

  const [tracks,  setTracks]  = useState([])
  const [idx,     setIdx]     = useState(0)
  const [playing, setPlaying] = useState(false)
  const [closed,  setClosed]  = useState(true) // fermé tant qu'on ne sait pas qui est connecté
  const [ready,   setReady]   = useState(false)
  const audioRef = useRef(null)
  // position de reprise à appliquer UNE seule fois, sur la piste sauvegardée
  const resumeRef   = useRef({ idx: 0, pos: 0, applied: true })
  const lastSaveRef = useRef(0) // throttle des écritures localStorage

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

  // ── ATTENDRE LA CONNEXION ─────────────────────────────────────
  // Dès que l'utilisateur est connu, on charge SA piste + SA position.
  // Tant qu'aucun compte n'est connecté, le lecteur reste inactif.
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

  // mémorise la piste + la position PAR COMPTE (reprise exacte à la prochaine visite)
  const persist = (i, pos) => {
    if (!uid) return
    safeSet(`music_idx:${uid}`, String(i))
    safeSet(`music_pos:${uid}`, String(Math.max(0, Math.floor(pos || 0))))
  }

  // sauvegarde throttlée pendant la lecture (toutes les ~3 s)
  const onTimeUpdate = () => {
    const a = audioRef.current
    if (!a) return
    if (Math.abs(a.currentTime - lastSaveRef.current) >= 3) {
      lastSaveRef.current = a.currentTime
      persist(idx, a.currentTime)
    }
  }

  // applique la position de reprise une seule fois, quand la piste est prête
  const onLoadedMetadata = () => {
    const a = audioRef.current
    if (!a) return
    const r = resumeRef.current
    if (!r.applied && idx === r.idx && r.pos > 0 && r.pos < a.duration - 1) {
      a.currentTime = r.pos
    }
    r.applied = true
  }

  // sauvegarde aussi à la fermeture / passage en arrière-plan (position exacte)
  useEffect(() => {
    const save = () => { const a = audioRef.current; if (a) persist(idx, a.currentTime) }
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', save)
    return () => {
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', save)
    }
  }, [idx, uid]) // eslint-disable-line react-hooks/exhaustive-deps

  // Démarre la lecture une fois prêt. On tente d'abord IMMÉDIATEMENT (le clic
  // de connexion est une activation utilisateur récente et suffit souvent) ;
  // si le navigateur bloque encore, on démarre au tout premier geste suivant.
  useEffect(() => {
    if (!ready || closed || tracks.length === 0) return
    let done = false
    const arm = () => {
      window.addEventListener('pointerdown', start)
      window.addEventListener('keydown', start)
      window.addEventListener('touchstart', start)
    }
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
    // tentative immédiate (activation récente : ouverture de session)
    audioRef.current?.play().then(() => setPlaying(true)).catch(() => arm())
    return disarm
  }, [ready, closed, tracks])

  // quand la piste change, enchaîne la lecture si on écoutait déjà
  useEffect(() => {
    if (playing) audioRef.current?.play().catch(() => {})
  }, [idx]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !uid || closed || tracks.length === 0) return null
  const track = tracks[idx] || tracks[0]

  // piste SUIVANTE (enchaînement), puis retour au début de la playlist
  const next = () => setIdx(i => {
    const n = (i + 1) % tracks.length
    resumeRef.current.applied = true // ne pas ré-appliquer la reprise sur la piste suivante
    lastSaveRef.current = 0
    persist(n, 0)                     // la nouvelle piste démarre au début
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
    if (a) persist(idx, a.currentTime) // conserve la position même si on coupe
    a?.pause()
    setPlaying(false)
    setClosed(true)
    if (uid) safeSet(`music_off:${uid}`, '1')
  }

  return (
    <>
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
