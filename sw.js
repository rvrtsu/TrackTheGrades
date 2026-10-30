// Service worker: caches the app for offline use.
// When you change any app file, bump CACHE (e.g. gtf-v2) so devices pick up the update.
const CACHE = 'gtf-v9';
const SHELL = ['./', './index.html', './app.js', './config.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/tiger.svg', './icons/icon-maskable-512.png'];
// Third-party files the page needs (cached too, so it works with no internet)
const CDN = [
  'https://cdn.tailwindcss.com/3.4.17',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    // opaque cross-origin responses must be stored with put(), not add()
    await Promise.all(CDN.map((u) => fetch(u, { mode: 'no-cors' }).then((r) => c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Cache first for speed and offline, refresh in the background for next time
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  const u = new URL(req.url);
  // never cache or intercept the cloud database (sync requests and live streams)
  if ((u.pathname.includes('/sync/') || u.pathname.includes('/groups/')) && u.pathname.endsWith('.json')) return;
  if (/firebaseio\.com|firebasedatabase\.app/.test(u.hostname)) return;
  // config.js: always try the network first so your edits show up, fall back to cache offline
  if (u.pathname.endsWith('/config.js')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try { const r = await fetch(req, { cache: 'no-store' }); if (r.ok) c.put(req, r.clone()); return r; }
      catch (_) { return (await c.match(req)) || Response.error(); }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') return (await c.match('./index.html')) || Response.error();
    return Response.error();
  })());
});
