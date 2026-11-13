// Service worker: makes the page installable and usable offline.
const CACHE = 'holding-it-v21';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));

// Network first, so a new deploy shows up at once; the cache is only the offline fallback.
// Fonts come from another origin and are not cached: offline, the page falls back to system fonts.
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })
        // The cached page stands in for page loads only, never for a missing image or manifest.
        .then(hit => hit || (request.mode === 'navigate' ? caches.match('./') : Response.error())))
  );
});

// Tapping the reminder notification brings the app back.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => list[0] ? list[0].focus() : self.clients.openWindow('./')));
});
