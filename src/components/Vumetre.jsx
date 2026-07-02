import { useEffect, useRef } from 'react'
import { useMusic } from '../store/music'

// Vumètre 3D « colonnes sur scène » (Approche B).
// - perspective + léger rotateX/rotateY => les barres se lisent comme des
//   colonnes cylindriques dressées sur une estrade, avec faces (dessus / avant /
//   côté) simulées par des dégradés + box-shadow STATIQUES, capuchons de crête
//   et reflet de sol (-webkit-box-reflect).
// - Grave à GAUCHE, aigu à DROITE.
// - Réactivité : requestAnimationFrame qui lit getByteFrequencyData et écrit
//   DIRECTEMENT dans le DOM (uniquement `transform`, compositor-friendly).
//   Aucun setState par frame. Aucune anim de box-shadow / filter / width / bg.
// - États : repos (repli bas) / repli CSS keyframes (analyse bloquée) / réactif.

const N        = 14      // nombre de colonnes (12..16)
const H        = 26      // hauteur utile de la scène en px (bande ~26-40px)
const RW       = 4       // largeur d'une tige
const GAP      = 3       // espace entre colonnes
const CW       = 6       // largeur du capuchon de crête
const CH       = 2.5     // hauteur du capuchon de crête
const REST_MIN = 0.08    // plancher réactif (silence)
const PEAK_FALL= 0.02    // vitesse de retombée des capuchons de crête
const KLOW     = 0.18    // bas du keyframe de repli CSS
const ATTACK   = 0.55    // lissage montée (fluidité)
const DECAY    = 0.18    // lissage descente (fluidité)

// Silhouette de repos (basse) façon table de mixage.
const REST_IDLE = [0.16, 0.22, 0.18, 0.26, 0.20, 0.28, 0.22, 0.26, 0.20, 0.24, 0.18, 0.22, 0.16, 0.14]

// Habillage statique (jamais animé par frame).
// Ombrage cylindrique HORIZONTAL (bords sombres -> centre brillant) : reste
// correct sous scaleY (l'illusion de cylindre ne se déforme pas verticalement).
const CYL_GRAD =
  'linear-gradient(90deg,#5c4718 0%,#8A6B24 15%,#F4D875 40%,#FBEEB8 50%,#EFD584 60%,#C9A84C 80%,#6E551E 93%,#463612 100%)'
const CAP_GRAD = 'radial-gradient(ellipse at 42% 28%,#FFF7D6 0%,#F4D875 48%,#C9A84C 100%)'
const SIDE     = '1px 0 0 0 #4a3813, 2px 0 0 0 #33270d'              // face « côté » extrudée
const GLOW_ON  = SIDE + ', 0 0 7px rgba(244,216,117,0.28)'          // + halo doux quand ça joue
const CAP_GLOW = '0 0 5px 1px rgba(244,216,117,0.45)'

const KEYFRAMES =
  '@keyframes kx-rod{from{transform:scale3d(1,' + KLOW + ',1)}to{transform:scale3d(1,1,1)}}' +
  '@keyframes kx-cap{from{transform:translate3d(0,' + (-KLOW * H).toFixed(2) + 'px,0)}' +
  'to{transform:translate3d(0,' + (-H).toFixed(2) + 'px,0)}}'

export default function Vumetre({ playing }) {
  const analyser = useMusic(s => s.analyser)
  const bars = useRef([])   // tiges  -> bars.current[i]
  const caps = useRef([])   // crêtes -> caps.current[i]

  useEffect(() => {
    const rods = bars.current
    const tips = caps.current

    // ── RÉACTIF : analyse audio réelle ──────────────────────────────────────
    if (playing && analyser) {
      const binCount = analyser.frequencyBinCount        // 64 (fftSize 128)
      const data = new Uint8Array(binCount)
      const usable = Math.floor(binCount * 0.82)         // on ignore l'extrême aigu (souvent vide)
      const vals = new Array(N).fill(REST_MIN)           // hauteurs lissées (alloué une fois)
      const peaks = new Array(N).fill(0)
      let raf = 0

      const draw = () => {
        analyser.getByteFrequencyData(data)
        for (let i = 0; i < N; i++) {
          const s = Math.floor((i / N) * usable)
          const e = Math.max(s + 1, Math.floor(((i + 1) / N) * usable))
          let sum = 0
          for (let j = s; j < e; j++) sum += data[j]
          const avg = (sum / (e - s)) / 255
          // léger « tilt » grave : les colonnes de gauche respirent un peu plus fort
          const boost = 1.28 + (1 - i / N) * 0.22
          let target = REST_MIN + avg * boost
          if (target > 1) target = 1
          // lissage attaque/relâche => mouvement fluide, sans jitter (60fps)
          const k = target > vals[i] ? ATTACK : DECAY
          const v = vals[i] + (target - vals[i]) * k
          vals[i] = v

          const rod = rods[i]
          if (rod) rod.style.transform = 'scale3d(1,' + v.toFixed(3) + ',1)'

          // maintien de crête + retombée douce
          let p = peaks[i] - PEAK_FALL
          if (v > p) p = v
          peaks[i] = p
          const cap = tips[i]
          if (cap) cap.style.transform = 'translate3d(0,' + (-p * H).toFixed(1) + 'px,0)'
        }
        raf = requestAnimationFrame(draw)
      }
      draw()
      return () => cancelAnimationFrame(raf)
    }

    // ── REPLI : ça joue mais pas d'analyse (CORS / bloqué) ───────────────────
    // On efface le transform inline pour laisser les keyframes CSS prendre la main.
    if (playing && !analyser) {
      for (let i = 0; i < N; i++) {
        if (rods[i]) rods[i].style.transform = ''
        if (tips[i]) tips[i].style.transform = ''
      }
      return
    }

    // ── REPOS : à l'arrêt, on retombe sur la silhouette basse ────────────────
    for (let i = 0; i < N; i++) {
      const r = REST_IDLE[i]
      if (rods[i]) rods[i].style.transform = 'scale3d(1,' + r + ',1)'
      if (tips[i]) tips[i].style.transform = 'translate3d(0,' + (-r * H).toFixed(2) + 'px,0)'
    }
  }, [playing, analyser])

  const fallback = playing && !analyser

  return (
    <div
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        height: H,
        paddingRight: 2,            // évite que la face « côté » ne soit rognée à droite
        perspective: '480px',
        perspectiveOrigin: '50% 42%',
        flexShrink: 0,
        pointerEvents: 'none',
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Estrade 3D légèrement inclinée + reflet de sol. Transform statique. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: GAP,
          height: '100%',
          transform: 'rotateX(11deg) rotateY(-7deg)',
          WebkitBoxReflect: 'below 1px linear-gradient(transparent 28%, rgba(30,22,6,0.20) 100%)',
        }}
      >
        {Array.from({ length: N }).map((_, i) => {
          const dur   = (0.5 + (i % 5) * 0.08).toFixed(2)
          const delay = (i * 0.045).toFixed(2)
          // Tige et capuchon partagent EXACTEMENT le même timing => la crête
          // reste collée au sommet pendant le repli CSS.
          const rodAnim = fallback ? 'kx-rod ' + dur + 's ease-in-out ' + delay + 's infinite alternate' : 'none'
          const capAnim = fallback ? 'kx-cap ' + dur + 's ease-in-out ' + delay + 's infinite alternate' : 'none'
          const rest = REST_IDLE[i]

          return (
            <div key={i} style={{ position: 'relative', width: RW, height: '100%', flex: '0 0 auto' }}>
              {/* TIGE cylindrique — seul `transform` change par frame */}
              <span
                ref={el => { bars.current[i] = el }}
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: 0,
                  width: RW,
                  height: '100%',
                  borderRadius: '2px 2px 1px 1px',
                  background: CYL_GRAD,
                  boxShadow: playing ? GLOW_ON : SIDE,
                  transformOrigin: '50% 100%',
                  transform: 'scale3d(1,' + rest + ',1)',   // base constante -> React ne l'écrit qu'au montage
                  animation: rodAnim,
                  willChange: 'transform',
                }}
              />
              {/* CAPUCHON de crête (face « dessus ») */}
              <span
                ref={el => { caps.current[i] = el }}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  marginLeft: -(CW / 2),
                  width: CW,
                  height: CH,
                  borderRadius: '45%',
                  background: CAP_GRAD,
                  boxShadow: playing ? CAP_GLOW : 'none',
                  transformOrigin: '50% 100%',
                  transform: 'translate3d(0,' + (-rest * H).toFixed(2) + 'px,0)',
                  animation: capAnim,
                  willChange: 'transform',
                  zIndex: 2,
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
