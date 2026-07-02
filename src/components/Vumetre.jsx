import { useEffect, useRef } from 'react'
import { useMusic } from '../store/music'

// ─────────────────────────────────────────────────────────────────────────────
// Vumètre — Approche C : SPECTRE pseudo-3D sur CANVAS.
//
// Un seul <canvas> redessiné à chaque frame de requestAnimationFrame. Chaque
// barre est « extrudée » en isométrique : face AVANT (dégradé cylindrique or),
// face CÔTÉ (or sombre) et face DESSUS (or clair), plus un capuchon de crête 3D
// et un REFLET de sol dégradé sous les barres. Grave à GAUCHE, aigu à DROITE.
//
// Réactivité : la boucle RAF lit analyser.getByteFrequencyData(...) et peint le
// canvas. AUCUN setState par frame. Un seul élément DOM => extrêmement léger.
//
// États :
//   * playing && analyser  -> réactif (analyse audio réelle).
//   * playing && !analyser -> animation de repli auto-portée (RAF synthétique,
//                             NE dépend jamais du son ; équivalent canvas du
//                             « fallback keyframes » : reste vivant si l'analyse
//                             est bloquée / CORS).
//   * !playing (|| !analyser) -> silhouette basse au repos (une seule passe).
//
// Perf : DPR géré (canvas net), redimensionnement géré, ZÉRO allocation par
// frame (buffers + dégradés mis en cache, reconstruits seulement au resize).
// ─────────────────────────────────────────────────────────────────────────────

const N        = 14      // nombre de barres (12..16)
const CSS_W    = 110     // largeur CSS du canvas (px)
const CSS_H    = 30      // hauteur CSS — la bande fait ~26..40px
const GAP      = 3       // espace entre barres (px CSS)
const PAD_L    = 2       // marge gauche
const PAD_R    = 2       // marge droite
const DEPTH_X  = 3       // profondeur d'extrusion (vers la droite)
const DEPTH_Y  = 3       // profondeur d'extrusion (vers le haut)
const TOP_PAD  = 2       // air au-dessus des barres pleines (crêtes/glow)
const REFLECT_H= 6       // hauteur de la zone de reflet sous le sol
const GLOW_H   = 7       // hauteur du halo « chaud » en tête de barre
const CAP_H    = 2       // épaisseur du capuchon de crête
const REST_MIN = 0.06    // plancher réactif (silence)
const PEAK_FALL= 0.014   // vitesse de retombée des capuchons de crête
const ATTACK   = 0.55    // lissage montée
const DECAY    = 0.16    // lissage descente
const DPR_CAP  = 2       // plafond de densité de pixels (perf)

// Palette or sur noir.
const SIDE_COLOR = '#6b531f'   // face côté (or sombre / #8A6B24 assombri)
const TOP_COLOR  = '#FBEEB8'   // face dessus (or clair)
const CAP_FRONT  = '#F4D875'   // capuchon crête — avant
const CAP_TOP    = '#FFF7D6'   // capuchon crête — dessus

// Silhouette de repos (basse), façon table de mixage.
const REST_IDLE = new Float32Array(N)
for (let i = 0; i < N; i++) {
  REST_IDLE[i] = 0.10 + 0.045 * (0.5 + 0.5 * Math.sin(i * 1.15 + 0.4))
}

export default function Vumetre({ playing }) {
  const analyser  = useMusic(s => s.analyser)
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // ── état de mise en page (recalculé au resize) ──────────────────────────
    let cssW = CSS_W
    let cssH = CSS_H
    let barW = 4
    let floorY = 0
    let maxBarH = 0
    let cylGrads = new Array(N)   // dégradé cylindrique par barre (face avant)
    let glowGrad = null           // halo chaud en tête (vertical 0..GLOW_H)
    let refGrad  = null           // reflet de sol (vertical, or -> transparent)
    let floorGrad = null          // ligne de sol (horizontal, glow latéral)
    let ambGrad  = null           // lueur ambiante douce au pied

    const barX = i => PAD_L + i * (barW + GAP)

    const buildGradients = () => {
      // Face avant : ombrage cylindrique HORIZONTAL (bords sombres -> centre
      // brillant) => les barres se lisent comme des tiges rondes.
      for (let i = 0; i < N; i++) {
        const bx = barX(i)
        const g = ctx.createLinearGradient(bx, 0, bx + barW, 0)
        g.addColorStop(0.00, '#4a3813')
        g.addColorStop(0.14, '#8A6B24')
        g.addColorStop(0.42, '#F4D875')
        g.addColorStop(0.50, '#FDF3C8')
        g.addColorStop(0.60, '#EFD584')
        g.addColorStop(0.84, '#C9A84C')
        g.addColorStop(1.00, '#5c4718')
        cylGrads[i] = g
      }
      // Halo chaud en tête (défini en 0..GLOW_H, peint après translate).
      glowGrad = ctx.createLinearGradient(0, 0, 0, GLOW_H)
      glowGrad.addColorStop(0.00, 'rgba(255,247,214,0.55)')
      glowGrad.addColorStop(0.35, 'rgba(244,216,117,0.28)')
      glowGrad.addColorStop(1.00, 'rgba(244,216,117,0.00)')
      // Reflet de sol : or translucide au ras du sol -> transparent en bas.
      refGrad = ctx.createLinearGradient(0, floorY, 0, floorY + REFLECT_H)
      refGrad.addColorStop(0.00, 'rgba(201,168,76,0.34)')
      refGrad.addColorStop(0.55, 'rgba(138,107,36,0.12)')
      refGrad.addColorStop(1.00, 'rgba(138,107,36,0.00)')
      // Ligne de sol (glow latéral).
      floorGrad = ctx.createLinearGradient(0, 0, cssW, 0)
      floorGrad.addColorStop(0.00, 'rgba(244,216,117,0.00)')
      floorGrad.addColorStop(0.50, 'rgba(244,216,117,0.55)')
      floorGrad.addColorStop(1.00, 'rgba(244,216,117,0.00)')
      // Lueur ambiante au pied de la scène.
      ambGrad = ctx.createRadialGradient(cssW / 2, floorY, 2, cssW / 2, floorY, cssW * 0.62)
      ambGrad.addColorStop(0.00, 'rgba(201,168,76,0.16)')
      ambGrad.addColorStop(1.00, 'rgba(201,168,76,0.00)')
    }

    const layout = () => {
      cssW = canvas.clientWidth  || CSS_W
      cssH = canvas.clientHeight || CSS_H
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
      canvas.width  = Math.max(1, Math.round(cssW * dpr))
      canvas.height = Math.max(1, Math.round(cssH * dpr))
      // On dessine en pixels CSS ; le backing-store gère la netteté (retina).
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      floorY  = Math.round(cssH - REFLECT_H - 1)
      maxBarH = floorY - (DEPTH_Y + TOP_PAD)
      const groupW = cssW - PAD_L - PAD_R - DEPTH_X
      barW = (groupW - (N - 1) * GAP) / N
      buildGradients()
    }

    // ── PEINTURE d'une frame ────────────────────────────────────────────────
    const paint = (values, peaks, glowOn) => {
      ctx.clearRect(0, 0, cssW, cssH)

      // Lueur ambiante douce (additive) — statique visuellement, très peu coûteuse.
      if (glowOn) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = ambGrad
        ctx.fillRect(0, 0, cssW, floorY + 2)
        ctx.globalCompositeOperation = 'source-over'
      }

      // Reflets de sol (sous le plancher).
      ctx.fillStyle = refGrad
      for (let i = 0; i < N; i++) {
        const h  = values[i] * maxBarH
        const rH = Math.min(h * 0.6, REFLECT_H)
        if (rH > 0.5) ctx.fillRect(barX(i), floorY + 1, barW + DEPTH_X, rH)
      }

      // Ligne de sol lumineuse.
      ctx.fillStyle = floorGrad
      ctx.fillRect(0, floorY, cssW, 1)

      // Barres extrudées : côté (derrière) -> avant -> dessus.
      for (let i = 0; i < N; i++) {
        const h    = values[i] * maxBarH
        const bx   = barX(i)
        const topY = floorY - h

        // Face CÔTÉ (parallélogramme droit).
        ctx.fillStyle = SIDE_COLOR
        ctx.beginPath()
        ctx.moveTo(bx + barW,           topY)
        ctx.lineTo(bx + barW + DEPTH_X, topY - DEPTH_Y)
        ctx.lineTo(bx + barW + DEPTH_X, floorY - DEPTH_Y)
        ctx.lineTo(bx + barW,           floorY)
        ctx.closePath()
        ctx.fill()

        // Face AVANT (tige cylindrique).
        ctx.fillStyle = cylGrads[i]
        ctx.fillRect(bx, topY, barW, h)

        // Face DESSUS (parallélogramme clair).
        ctx.fillStyle = TOP_COLOR
        ctx.beginPath()
        ctx.moveTo(bx,                  topY)
        ctx.lineTo(bx + barW,           topY)
        ctx.lineTo(bx + barW + DEPTH_X, topY - DEPTH_Y)
        ctx.lineTo(bx + DEPTH_X,        topY - DEPTH_Y)
        ctx.closePath()
        ctx.fill()

        // Halo chaud en tête (additif, dégradé mis en cache + translate).
        if (glowOn) {
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.translate(bx, topY - DEPTH_Y)
          ctx.fillStyle = glowGrad
          ctx.fillRect(-1, 0, barW + DEPTH_X + 1, GLOW_H)
          ctx.restore()
        }

        // Capuchon de CRÊTE 3D.
        const pY = floorY - peaks[i] * maxBarH
        ctx.fillStyle = CAP_FRONT
        ctx.fillRect(bx, pY - CAP_H, barW, CAP_H)
        ctx.fillStyle = CAP_TOP
        ctx.beginPath()
        ctx.moveTo(bx,                  pY - CAP_H)
        ctx.lineTo(bx + barW,           pY - CAP_H)
        ctx.lineTo(bx + barW + DEPTH_X, pY - CAP_H - DEPTH_Y)
        ctx.lineTo(bx + DEPTH_X,        pY - CAP_H - DEPTH_Y)
        ctx.closePath()
        ctx.fill()
      }
    }

    // ── mise en page initiale + suivi du redimensionnement / DPR ─────────────
    layout()

    // buffers persistants (aucune allocation par frame)
    const values = new Float32Array(N)
    const peaks  = new Float32Array(N)

    let raf = 0
    let onResize = null

    // ── RÉACTIF : analyse audio réelle ──────────────────────────────────────
    if (playing && analyser) {
      const binCount = analyser.frequencyBinCount          // 64 (fftSize 128)
      const data = new Uint8Array(binCount)                // alloué UNE fois
      const usable = Math.floor(binCount * 0.82)           // ignore l'extrême aigu

      for (let i = 0; i < N; i++) { values[i] = REST_MIN; peaks[i] = REST_MIN }

      const draw = () => {
        analyser.getByteFrequencyData(data)
        for (let i = 0; i < N; i++) {
          // Grave à GAUCHE (bins bas) -> aigu à DROITE.
          const s = Math.floor((i / N) * usable)
          const e = Math.max(s + 1, Math.floor(((i + 1) / N) * usable))
          let sum = 0
          for (let j = s; j < e; j++) sum += data[j]
          const avg = (sum / (e - s)) / 255
          // léger tilt grave : la gauche « respire » un peu plus fort.
          const boost = 1.30 + (1 - i / N) * 0.22
          let target = REST_MIN + avg * boost
          if (target > 1) target = 1
          // lissage attaque/relâche pour un rendu fluide.
          const k = target > values[i] ? ATTACK : DECAY
          const v = values[i] + (target - values[i]) * k
          values[i] = v
          // maintien de crête + retombée douce.
          let p = peaks[i] - PEAK_FALL
          if (v > p) p = v
          peaks[i] = p
        }
        paint(values, peaks, true)
        raf = requestAnimationFrame(draw)
      }

      onResize = () => layout()
      window.addEventListener('resize', onResize)
      draw()
      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', onResize)
      }
    }

    // ── REPLI : ça joue mais pas d'analyse (CORS / bloqué) ───────────────────
    // Animation auto-portée (n'utilise PAS le son) — équivalent canvas du
    // fallback CSS keyframes, pour que le vumètre reste vivant.
    if (playing && !analyser) {
      for (let i = 0; i < N; i++) { values[i] = REST_MIN; peaks[i] = REST_MIN }

      const draw = () => {
        const t = performance.now() / 1000
        for (let i = 0; i < N; i++) {
          const f = i / N
          const env = 0.90 - 0.50 * f                 // grave plus fort à gauche
          const s1 = 0.5 + 0.5 * Math.sin(t * 5.0 + i * 0.85)
          const s2 = 0.5 + 0.5 * Math.sin(t * 2.7 - i * 0.55 + 1.3)
          let target = REST_MIN + env * (0.22 + 0.70 * (0.6 * s1 + 0.4 * s2))
          if (target > 1) target = 1
          const k = target > values[i] ? ATTACK : DECAY
          const v = values[i] + (target - values[i]) * k
          values[i] = v
          let p = peaks[i] - PEAK_FALL
          if (v > p) p = v
          peaks[i] = p
        }
        paint(values, peaks, true)
        raf = requestAnimationFrame(draw)
      }

      onResize = () => layout()
      window.addEventListener('resize', onResize)
      draw()
      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', onResize)
      }
    }

    // ── REPOS : à l'arrêt, silhouette basse (une seule passe, pas de RAF) ─────
    for (let i = 0; i < N; i++) { values[i] = REST_IDLE[i]; peaks[i] = REST_IDLE[i] }
    paint(values, peaks, false)

    onResize = () => {
      layout()
      paint(values, peaks, false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [playing, analyser])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      width={CSS_W}
      height={CSS_H}
      style={{
        width: CSS_W,
        height: CSS_H,
        display: 'block',
        flexShrink: 0,
        pointerEvents: 'none',
        // léger reflet miroir supplémentaire, statique (WebKit).
        WebkitBoxReflect: 'below 0 linear-gradient(transparent 70%, rgba(30,22,6,0.10) 100%)',
      }}
    />
  )
}
