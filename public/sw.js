// Service worker — cache hors ligne.
//
// Regle d'or : JAMAIS de cache-first sur le document. Les noms d'assets
// sont haches ; un index.html servi depuis le cache pointe vers des
// fichiers supprimes au deploiement suivant, et la page reste blanche.
// C'est precisement ce qui est arrive avec konnexyon-v1.

const CACHE = 'konnexyon-v2-ecriture'

// Uniquement des URL dont on est sur qu'elles existent : addAll rejette
// en bloc au premier 404, et l'installation entiere echoue avec.
const STATIC = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // allSettled plutot que addAll : une ressource manquante ne doit
      // pas empecher le service worker de s'installer
      .then(c => Promise.allSettled(STATIC.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

const estNavigation = req =>
  req.mode === 'navigate' ||
  (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'))

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  if (req.url.includes('supabase.co')) return          // jamais cacher l'API

  // Document : reseau d'abord, cache seulement si hors ligne.
  if (estNavigation(req)) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put('/index.html', clone))
          }
          return res
        })
        .catch(() => caches.match('/index.html').then(r => r || Response.error()))
    )
    return
  }

  // Assets haches : le nom change a chaque version, le cache ne peut pas
  // devenir perime. Cache d'abord, reseau en secours.
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached
      return fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(req, clone))
        }
        return res
      })
    })
  )
})
