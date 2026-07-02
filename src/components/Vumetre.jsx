import { useEffect, useRef } from 'react'
import { useMusic } from '../store/music'

// Vumètre CIRCULAIRE — anneau doré qui pulse au rythme du son.
// Spectre radial (barres qui rayonnent, grave en haut, symétrique gauche/droite),
// cœur qui bat avec le grave, rotation lente + halo. Rendu canvas unique : léger.
// - playing && analyser  -> réactif (analyse audio réelle)
// - playing && !analyser -> repli animé synthétique (jamais lié au son)
// - !playing             -> respiration douce, atténuée
const SIZE    = 44   // diamètre CSS (px)
const DPR_CAP = 2
const NUM     = 48   // barres radiales
const BASE_R  = 7    // rayon de l'anneau de base
const BAR_IN  = 9    // départ des barres
const BAR_MAX = 10   // longueur max d'une barre

export default function Vumetre({ playing }) {
  const analyser  = useMusic(s => s.analyser)
  const canvasRef = useRef(null)
  // la boucle RAF lit l'état courant via cette ref (une seule boucle, pas de redémarrage)
  const stRef = useRef({ playing, analyser })
  stRef.current = { playing, analyser }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
    canvas.width  = SIZE * dpr
    canvas.height = SIZE * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cx = SIZE / 2, cy = SIZE / 2, half = NUM / 2

    // dégradés cachés (jamais recréés par frame)
    const barGrad = ctx.createRadialGradient(0, 0, BAR_IN, 0, 0, BAR_IN + BAR_MAX + 2)
    barGrad.addColorStop(0.0, '#8A6B24')
    barGrad.addColorStop(0.5, '#F4D875')
    barGrad.addColorStop(1.0, '#FFF3C8')
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, BASE_R + 7)
    coreGrad.addColorStop(0.0, 'rgba(255,247,214,0.95)')
    coreGrad.addColorStop(0.45, 'rgba(244,216,117,0.5)')
    coreGrad.addColorStop(1.0, 'rgba(201,168,76,0)')

    let data = null, usable = 0
    const bindData = an => { if (an) { data = new Uint8Array(an.frequencyBinCount); usable = Math.floor(an.frequencyBinCount * 0.9) } }
    bindData(analyser)

    let lvl = 0        // niveau de grave lissé (cœur)
    let raf = 0
    const t0 = performance.now()

    const frame = tms => {
      const t = (tms - t0) / 1000
      const { playing: pl, analyser: an } = stRef.current
      if (an && (!data || data.length !== an.frequencyBinCount)) bindData(an)

      ctx.clearRect(0, 0, SIZE, SIZE)

      // niveau (cœur) + fonction de hauteur par barre selon l'état
      let valAt
      if (pl && an && data) {
        an.getByteFrequencyData(data)
        let b = 0; for (let j = 0; j < 6; j++) b += data[j]
        const bass = b / 6 / 255
        lvl += (bass - lvl) * 0.25
        valAt = m => data[Math.floor((m / half) * usable)] / 255
      } else if (pl && !an) {
        lvl += (0.45 + 0.25 * Math.sin(t * 3) - lvl) * 0.2
        valAt = (m, a) => 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 4 + a * 3))
      } else {
        lvl += (0.24 + 0.12 * Math.sin(t * 1.6) - lvl) * 0.1
        valAt = (m, a) => 0.18 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.6 + a * 2))
      }

      const alpha = pl ? 1 : 0.62

      // ── barres radiales (rotation lente) ──
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.25)
      ctx.globalAlpha = alpha
      ctx.strokeStyle = barGrad
      ctx.lineCap = 'round'
      ctx.lineWidth = 2
      for (let i = 0; i < NUM; i++) {
        const a  = (i / NUM) * Math.PI * 2
        const m  = i < half ? i : NUM - i          // symétrie : grave en haut
        const v  = Math.min(1, valAt(m, a))
        const len = 1.5 + v * BAR_MAX
        const c = Math.cos(a), s = Math.sin(a)
        ctx.beginPath()
        ctx.moveTo(c * BAR_IN, s * BAR_IN)
        ctx.lineTo(c * (BAR_IN + len), s * (BAR_IN + len))
        ctx.stroke()
      }
      ctx.restore()

      // ── anneau de base ──
      ctx.globalAlpha = alpha
      ctx.strokeStyle = 'rgba(201,168,76,0.55)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, BASE_R, 0, Math.PI * 2)
      ctx.stroke()

      // ── cœur qui pulse (halo + noyau) ──
      ctx.globalAlpha = alpha
      ctx.fillStyle = coreGrad
      ctx.beginPath()
      ctx.arc(cx, cy, BASE_R + 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = alpha * 0.95
      ctx.fillStyle = '#FBEEB8'
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(2, 2.5 + lvl * 4.5), 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        width: SIZE, height: SIZE, display: 'block', flexShrink: 0,
        filter: 'drop-shadow(0 0 5px rgba(244,216,117,0.4))',
      }}
    />
  )
}
