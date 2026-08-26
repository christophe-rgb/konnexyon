import { useEffect } from 'react'
import { useCookieConsent } from './CookieBanner'

/**
 * La balise WeCanTrack — attribution des ventes d'affiliation.
 *
 * Elle repere les liens d'affiliation dans la page, y ajoute son
 * identifiant, et collecte les donnees de session et de clic. C'est donc
 * un traceur tiers : elle ne se charge qu'apres un consentement
 * explicite, jamais avant, et disparait si le consentement est refuse.
 *
 * Sans identifiant en environnement, rien ne se charge : le site marche
 * sans, la boutique aussi. Seule l'attribution manque.
 */
const ID = import.meta.env?.VITE_WECANTRACK_ID || null
const SOURCE = 'https://static.wecantrack.com/tracker.js'

export default function WeCanTrack() {
  const { consent } = useCookieConsent()

  useEffect(() => {
    if (!ID || consent !== 'accepted') return
    if (document.querySelector('script[data-wecantrack]')) return

    const balise = document.createElement('script')
    balise.src = SOURCE
    balise.async = true
    balise.defer = true
    balise.dataset.wecantrack = ID
    // un traceur qui tombe ne doit pas faire de bruit dans la console
    balise.onerror = () => balise.remove()
    document.head.appendChild(balise)

    return () => { balise.remove() }
  }, [consent])

  return null
}
