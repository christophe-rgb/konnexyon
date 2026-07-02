import { useEffect, useRef, useState } from 'react'
import { safeGet, safeSet } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { useMusic } from '../store/music'

// Lecteur de musique de fond — INVISIBLE : il ne rend que la balise <audio> et
// gère toute la logique (playlist, autoplay, reprise par compte, enchaînement,
// analyse audio réelle). Son état est poussé dans le store `useMusic`, lu par la
// barre de navigation qui affiche le vumètre + les contrôles.
export default function MusicPlayer() {
  const user = useAuthStore(s => s.user)
  const uid  = user?.id

  const [tracks,  setTracks]  = useState([])
  const [idx,     setIdx]     = useState(0)
  const [playing, setPlaying] = useState(false)
  const [closed,  setClosed]  = useState(true) // fermé tant qu'on ne sait pas qui est connecté
  const [ready,   setReady]   = useState(false)
  const [corsFailed, setCorsFailed] = useState(false) // CORS bloqué → son sans analyse
  const audioRef = useRef(null)
  const resumeRef   = useRef({ idx: 0, pos: 0, applied: true })
  const lastSaveRef = useRef(0)
  const wantPlayRef = useRef(false) // intention de lecture continue (pour l'enchaînement)

  // Web Audio (vumètre réactif)
  const ctxRef      = useRef(null)
  const srcRef      = useRef(null)
  const analyserRef = useRef(null)

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

  // ── Vumètre réactif : construit le graphe Web Audio (UNE fois), TOUJOURS
  //    appelé depuis un geste utilisateur (clic play / 1er geste) pour que le
  //    contexte puisse démarrer — sinon le son serait coupé.
  const setupAnalyser = () => {
    if (srcRef.current) return
    const a = audioRef.current
    const AC = window.AudioContext || window.webkitAudioContext
    if (!a || !AC || corsFailed || a.crossOrigin !== 'anonymous') return
    try {
      const ctx = new AC()
      const src = ctx.createMediaElementSource(a)
      const an  = ctx.createAnalyser()
      an.fftSize = 128
      an.smoothingTimeConstant = 0.8
      src.connect(an)
      an.connect(ctx.destination)
      ctxRef.current = ctx; srcRef.current = src; analyserRef.current = an
      useMusic.setState({ analyser: an })
    } catch { /* on laisse le son passer normalement, vumètre en repli CSS */ }
  }

  // Si le chargement échoue avec CORS, on retire crossOrigin (via l'état → React
  // recharge sans CORS) : le SON prime, le vumètre bascule en CSS.
  const onAudioError = () => {
    if (!corsFailed && audioRef.current?.crossOrigin === 'anonymous') {
      setCorsFailed(true)
      useMusic.setState({ analyser: null })
    }
  }
  useEffect(() => {
    if (corsFailed && wantPlayRef.current) audioRef.current?.play().then(() => setPlaying(true)).catch(() => {})
  }, [corsFailed])

  // sauvegarde à la fermeture / passage en arrière-plan
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
      setupAnalyser()                       // dans un geste → contexte autorisé
      ctxRef.current?.resume?.().catch(() => {})
      audioRef.current?.play().then(() => { setPlaying(true); disarm() }).catch(() => { done = false })
    }
    audioRef.current?.play().then(() => setPlaying(true)).catch(() => {
      window.addEventListener('pointerdown', start)
      window.addEventListener('keydown', start)
      window.addEventListener('touchstart', start)
    })
    return disarm
  }, [ready, closed, tracks]) // eslint-disable-line react-hooks/exhaustive-deps

  // enchaînement : quand l'index change, on relit si l'intention de lecture est active
  useEffect(() => {
    if (wantPlayRef.current) audioRef.current?.play().catch(() => {})
  }, [idx])

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
    if (playing) { wantPlayRef.current = false; a.pause(); setPlaying(false) }
    else {
      setupAnalyser()                        // dans le clic → contexte autorisé
      ctxRef.current?.resume?.().catch(() => {})
      a.play().then(() => setPlaying(true)).catch(() => {})
    }
  }
  const close = () => {
    const a = audioRef.current
    if (a) persist(idx, a.currentTime)
    wantPlayRef.current = false
    a?.pause()
    setPlaying(false)
    setClosed(true)
    if (uid) safeSet(`music_off:${uid}`, '1')
  }
  // rouvre le lecteur après une fermeture (relance la lecture dans le geste)
  const reopen = () => {
    if (uid) safeSet(`music_off:${uid}`, '0')
    wantPlayRef.current = true
    setClosed(false)
    setupAnalyser()
    ctxRef.current?.resume?.().catch(() => {})
    audioRef.current?.play().then(() => setPlaying(true)).catch(() => {})
  }

  // enregistre des contrôles stables qui lisent toujours la dernière version
  const hRef = useRef({})
  hRef.current = { toggle, next, close, reopen }
  useEffect(() => {
    useMusic.setState({
      toggle: () => hRef.current.toggle(),
      next:   () => hRef.current.next(),
      close:  () => hRef.current.close(),
      reopen: () => hRef.current.reopen(),
    })
  }, [])

  // pousse l'état d'affichage vers le store (lu par la Navbar)
  const available = !!(ready && uid && tracks.length > 0)
  useEffect(() => {
    useMusic.setState({ active, available, playing, title: track?.title || 'Konnexyon' })
  }, [active, available, playing, track?.title])

  // au démontage (logout…), désactive proprement
  useEffect(() => () => useMusic.setState({ active: false, available: false, playing: false }), [])

  if (!active) return null
  return (
    <audio
      ref={audioRef}
      src={track.src}
      crossOrigin={corsFailed ? undefined : 'anonymous'}
      onEnded={next}
      onError={onAudioError}
      onPlay={() => { setPlaying(true); wantPlayRef.current = true }}
      onPause={() => setPlaying(false)}
      onTimeUpdate={onTimeUpdate}
      onLoadedMetadata={onLoadedMetadata}
      preload="auto"
    />
  )
}
