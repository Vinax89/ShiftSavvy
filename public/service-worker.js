const CACHE = 'nf-shell-v1'
const PRECACHE = [ '/', '/manifest.webmanifest', '/favicon.ico' ]
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)))
  self.skipWaiting()
})
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })
self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  e.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(res => {
      const copy = res.clone()
      caches.open(CACHE).then(cache => cache.put(request, copy)).catch(()=>{})
      return res
    }).catch(() => cached))
  )
})
// Background Sync → notify clients to flush the queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-queue') {
    event.waitUntil((async () => {
      const clients = await self.clients.matchAll({ includeUncontrolled: true })
      for (const c of clients) c.postMessage({ type: 'SYNC_FLUSH' })
    })())
  }
})
