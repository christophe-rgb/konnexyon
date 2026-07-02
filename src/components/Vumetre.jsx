import { useEffect, useRef } from 'react'
import { useMusic } from '../store/music'

// Vumètre. Si l'analyse audio réelle est disponible (AnalyserNode fourni par
// MusicPlayer), les barres réagissent au son en temps réel : grave à gauche →
// aigu à droite. Sinon (analyse bloquée/CORS), repli sur une animation CSS.
const N = 14
// hauteurs de repos pour le repli CSS (profil « table de mixage »)
const REST = [0.35, 0.6, 0.8, 0.55, 0.9, 0.5, 1, 0.65, 0.85, 0.45, 0.75, 0.55, 0.7, 0.4]

export default function Vumetre({ playing }) {
  const analyser = useMusic(s => s.analyser)
  const bars = useRef([])

  useEffect(() => {
    if (!playing || !analyser) {
      bars.current.forEach(el => { if (el) el.style.transform = 'scaleY(0.14)' })
      return
    }
    const bins   = analyser.frequencyBinCount
    const data   = new Uint8Array(bins)
    const usable = Math.floor(bins * 0.82) // on ignore l'extrême aigu (souvent vide)
    let raf
    const draw = () => {
      analyser.getByteFrequencyData(data)
      for (let i = 0; i < N; i++) {
        const s = Math.floor((i / N) * usable)
        const e = Math.max(s + 1, Math.floor(((i + 1) / N) * usable))
        let sum = 0
        for (let j = s; j < e; j++) sum += data[j]
        const avg = (sum / (e - s)) / 255
        const el = bars.current[i]
        if (el) el.style.transform = `scaleY(${Math.min(1, 0.1 + avg * 1.3).toFixed(3)})`
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [playing, analyser])

  const cssFallback = playing && !analyser

  return (
    <div aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24, flexShrink: 0 }}>
      <style>{`@keyframes kx-eq { 0% { transform: scaleY(0.2) } 100% { transform: scaleY(1) } }`}</style>
      {Array.from({ length: N }).map((_, i) => (
        <span
          key={i}
          ref={el => { bars.current[i] = el }}
          style={{
            width: 3, height: '100%', borderRadius: 2,
            background: 'linear-gradient(180deg,#F4D875 0%,#C9A84C 55%,#8A6B24 100%)',
            transformOrigin: 'bottom',
            transform: `scaleY(${cssFallback ? REST[i % REST.length] : 0.14})`,
            animation: cssFallback
              ? `kx-eq ${(0.26 + (i % 4) * 0.06).toFixed(2)}s ease-in-out ${(i * 0.03).toFixed(2)}s infinite alternate`
              : 'none',
            boxShadow: playing ? '0 0 5px rgba(201,168,76,0.45)' : 'none',
          }}
        />
      ))}
    </div>
  )
}
