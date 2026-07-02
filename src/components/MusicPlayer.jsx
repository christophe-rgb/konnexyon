import { useEffect, useRef, useState } from 'react'
import { safeGet, safeSet } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { useMusic } from '../store/music'

// Lecteur de musique de fond — INVISIBLE : il ne rend que la balise <audio> et
// gère toute la logique (playlist, autoplay, reprise par compte). Son état est
// poussé dans le store `useMusic`, lu par la barre de navigation qui affiche le
// vumètre + les contrôles (titre, play, fermer).
//
// - Démarre au 1er geste utilisateur (contourne le blocage autoplay), une fois
//   le visiteur CONNECTÉ. Piste + position mémorisées PAR COMPTE (chacun reprend
//   exactement à son point d'arrêt).
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

  const track  = tracks[idx] || tracks[0]
  const active = !!(ready && uid && !closed && tracks.length > 0)

  // ── Contrôles (exposés à la Navbar via le store) ─────────────
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

  // enregistre des contrôles stables qui lisent toujours la dernière version
  const hRef = useRef({})
  hRef.current = { toggle, next, close }
  useEffect(() => {
    useMusic.setState({
      toggle: () => hRef.current.toggle(),
      next:   () => hRef.current.next(),
      close:  () => hRef.current.close(),
    })
  }, [])

  // pousse l'état d'affichage vers le store (lu par la Navbar)
  useEffect(() => {
    useMusic.setState({ active, playing, title: track?.title || 'Konnexyon' })
  }, [active, playing, track?.title])

  // au démontage (logout…), désactive proprement
  useEffect(() => () => useMusic.setState({ active: false, playing: false }), [])

  if (!active) return null
  return (
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
  )
}
