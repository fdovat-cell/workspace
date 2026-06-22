const CACHE = 'workspace-v1';
const STATIC = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const NET_ONLY = ['supabase.co', 'workers.dev', 'open-meteo.com', 'geocoding-api', 'googleapis.com', 'open.er-api.com', 'accounts.google.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  // Network-only for API/external calls
  if (NET_ONLY.some(d => url.includes(d))) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({error: 'offline'}), {
          status: 503,
          headers: {'Content-Type': 'application/json'}
        })
      )
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
