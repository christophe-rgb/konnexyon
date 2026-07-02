const CACHE = 'konnexyon-v4'
const STATIC = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)
  // Ne jamais gérer le cross-origin (API Supabase, tuiles carte, polices…)
  if (url.origin !== self.location.origin) return

  // Navigation (HTML) → NETWORK-FIRST : toujours la dernière version déployée.
  // (sinon le SW ressert un ancien index.html qui pointe vers un vieux bundle)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put('/index.html', clone))
          return res
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('/index.html')))
    )
    return
  }

  // Autres assets same-origin → stale-while-revalidate :
  // réponse immédiate depuis le cache, mise à jour en arrière-plan.
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put(e.request, clone))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
