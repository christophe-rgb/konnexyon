import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'

// Transition douce à chaque changement de page (fondu). Visible sur TOUT le site,
// appli comprise. On anime UNIQUEMENT l'opacité (autoAlpha) — aucun transform,
// pour ne pas casser le positionnement des éléments fixes enfants. Respecte
// prefers-reduced-motion.
export default function PageTransition({ children }) {
  const { pathname } = useLocation()
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(ref.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'power2.out' })
  }, [pathname])

  return <div ref={ref}>{children}</div>
}
