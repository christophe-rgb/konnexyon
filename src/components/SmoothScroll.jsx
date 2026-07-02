import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Scroll fluide « façon agence » (Lenis) + synchronisation GSAP ScrollTrigger.
// On N'ACTIVE PAS Lenis sur les écrans d'application (carte, listes, chat,
// admin…) où le défilement interne natif doit rester intact — uniquement sur
// les pages vitrine / contenu. Respecte prefers-reduced-motion.
const APP_ROUTE = /^\/(discover|matches|messages|profile|settings|admin)/

export default function SmoothScroll() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Remonte en haut à chaque changement de page (comportement attendu d'un site).
    window.scrollTo(0, 0)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (APP_ROUTE.test(pathname) || reduce) {
      ScrollTrigger.refresh()
      return
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    })
    lenis.on('scroll', ScrollTrigger.update)
    const raf = time => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    ScrollTrigger.refresh()

    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [pathname])

  return null
}
