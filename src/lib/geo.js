// Résolution de la position d'un couple à l'onboarding.
//
// Stratégie en deux temps :
//   1. GPS navigateur (précis) — si l'utilisateur l'accorde.
//   2. Fallback géolocalisation IP (approximatif, niveau ville) — si le GPS
//      est refusé, indisponible ou trop lent.
//
// Sans ce fallback, un couple qui refuse la géoloc est créé sans `location`
// et n'apparaît JAMAIS sur la carte (le RPC get_nearby_compatible_profiles
// écarte tout profil sans coordonnées). La position IP reste volontairement
// grossière : on n'expose pas l'adresse exacte.

// Tente le GPS navigateur. Résout { lng, lat } ou null (jamais de rejet).
function getGpsLocation(timeoutMs = 8000) {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      () => resolve(null),
      { timeout: timeoutMs, enableHighAccuracy: false, maximumAge: 600000 },
    )
  })
}

// Géolocalisation IP approximative. Essaie plusieurs fournisseurs (HTTPS +
// CORS) avec un court timeout chacun. Résout { lng, lat } ou null.
async function getIpLocation(timeoutMs = 4000) {
  const providers = [
    { url: 'https://ipwho.is/',     pick: j => [j.longitude, j.latitude] },
    { url: 'https://ipapi.co/json/', pick: j => [j.longitude, j.latitude] },
  ]
  for (const { url, pick } of providers) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      const res = await fetch(url, { signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) continue
      const json = await res.json()
      const [lng, lat] = pick(json)
      const nLng = Number(lng), nLat = Number(lat)
      // Rejette les réponses vides ou l'île nulle (0,0)
      if (Number.isFinite(nLng) && Number.isFinite(nLat) && (nLng !== 0 || nLat !== 0)) {
        return { lng: nLng, lat: nLat }
      }
    } catch {
      // fournisseur indisponible → on passe au suivant
    }
  }
  return null
}

// Résout la meilleure position disponible.
// Retourne { lng, lat, approximate } ou null si rien n'a pu être déterminé.
export async function resolveOnboardingLocation() {
  const gps = await getGpsLocation()
  if (gps) return { ...gps, approximate: false }

  const ip = await getIpLocation()
  if (ip) return { ...ip, approximate: true }

  return null
}
