import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Apparition douce au défilement (fondu + léger glissement vers le haut).
// Se déclenche une seule fois quand l'élément entre dans l'écran. Respecte
// prefers-reduced-motion (aucune animation, contenu visible d'emblée).
export default function Reveal({
  children, as: Tag = 'div', y = 28, delay = 0, duration = 0.9, className, style,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1, y: 0, duration, delay, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        },
      )
    }, el)

    return () => ctx.revert()
  }, [])

  return <Tag ref={ref} className={className} style={style}>{children}</Tag>
}
