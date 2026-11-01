// Service worker: caches the app for offline use.
// When you change any app file, bump CACHE (next: gradely-v37-final-2) so devices pick up the update.
// v37 final fixed (Home View more / View less spacing, faster 0.2s collapse): CACHE = gradely-v37-final-fixed.
// v37 final (Tracker: move subjects up/down, collapsible Options categories; Reverse Calculator redesign with Prelims/Finals/Semestral toggle, 100% or 5-point target per period, named target output boxes): CACHE = gradely-v37-final.
// v37 step 2 uifixes (card shadows, lock badge, one-line aligned bios, Sign Out moved into Edit account): CACHE = gradely-v37-step2-final-uifixes.
// v37 step 2 fixed (Blue, Green, Classic and Monochrome restored; Teal, Sky, Indigo, Rose, Orange, Peach, Lime, Slate added): CACHE = gradely-v37-step2-fixed.
// v37 step 2 (Home auth states: Sign Out row, Profiles/Groups actions fold into View more, groups auto-link to the signed-in profile, centred orphan cards): CACHE = gradely-v37-step2.
// v37 step 1 (theme engine: Color + Mode, off-white light mode, Quick actions carousel, tiger watermark, lowkey creators link): CACHE = gradely-v37-step1.
// v36 final (compact Home, 2-column cards, slim Quick actions row, Creators pop-up, tutorial button fix): CACHE = gradely-v36-final.
// Update flow: a new version installs quietly and WAITS. The app shows "Update Available! Tap to refresh";
// tapping it sends SKIP_WAITING, the new worker activates, and the page reloads once on controllerchange.
const CACHE = 'gradely-v37-final-fixed';
const SHELL = ['./', './index.html', './app.js', './config.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/tiger.svg', './icons/icon-maskable-512.png', './icons/creator-joshua.jpg', './icons/creator-jhon.jpg'];
// Third-party files the page needs (cached too, so it works with no internet)
const CDN = [
  'https://cdn.tailwindcss.com/3.4.17',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // bypass the browser HTTP cache so a new version never installs stale files
    await Promise.all(SHELL.map((u) => fetch(new Request(u, { cache: 'reload' })).then((r) => {
      if (!r.ok) throw new Error('precache failed: ' + u);
      return c.put(u, r);
    })));
    // opaque cross-origin responses must be stored with put(), not add()
    await Promise.all(CDN.map((u) => fetch(u, { mode: 'no-cors' }).then((r) => c.put(u, r)).catch(() => {})));
    // no skipWaiting() here on purpose: the person chooses when to switch (see the message handler)
  })());
});

// The app posts this when the person taps "Update Available! Tap to refresh"
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
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
  if (/firebaseio\.com|firebasedatabase\.app|googleapis\.com$/.test(u.hostname) && !/fonts\.googleapis\.com$/.test(u.hostname)) return;
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
