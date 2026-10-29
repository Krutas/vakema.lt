// Keeps the site's files in the browser after the first visit, so the next one opens from
// memory instead of the network. Visitors are told about it (and can switch it off) in the
// "temporary files" notice – see initCacheNotice() in js/chrome.js.
//
//   pages, shots.json  network first, cached copy when offline (updates arrive at once)
//   js/, styles.css    cached copy first, refreshed in the background (updates on the next visit)
//   assets/, CDN       cached copy first (versioned URLs: three@0.165.0, lite shots ?v=<render>)
//
// Bump VERSION to drop everything cached by an older build.
const VERSION = 'vakema-v1';
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Only our own caches: other sites on the same origin (e.g. github.io) keep theirs
    for (const key of await caches.keys()) if (key.startsWith('vakema-') && key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

// First visit: the page lists what it already fetched before this worker took over
self.addEventListener('message', (e) => {
  const urls = e.data?.keep;
  if (!Array.isArray(urls)) return;
  e.waitUntil((async () => {
    for (const href of new Set(urls)) {
      let url;
      try { url = new URL(href); } catch { continue; }
      if (url.searchParams.has('capture') || !(url.origin === location.origin || CDN.includes(url.hostname))) continue;
      const req = new Request(url, url.origin === location.origin ? {} : { mode: 'cors' });
      if (await caches.match(req)) continue;
      try {
        const res = await fetch(req); // normally straight from the HTTP cache
        if (usable(res)) await put(req, res, url.pathname.includes('/assets/'));
      } catch { /* skip what can't be fetched now */ }
    }
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return; // video seeking goes straight through
  const url = new URL(req.url);
  if (url.searchParams.has('capture')) return;
  if (url.origin === location.origin) {
    if (req.mode === 'navigate' || url.pathname.endsWith('.json')) e.respondWith(networkFirst(req));
    else if (url.pathname.includes('/assets/')) e.respondWith(cacheFirst(req, true));
    else if (/\.(js|css)$/.test(url.pathname)) e.respondWith(staleWhileRevalidate(e, req));
  } else if (CDN.includes(url.hostname)) {
    e.respondWith(cacheFirst(req, false));
  }
});

// Opaque (no-CORS) responses are skipped: browsers count each as megabytes of quota
const usable = (res) => res && res.ok;

async function put(req, res, replaceOlder) {
  const cache = await caches.open(VERSION);
  if (replaceOlder) {
    // A re-rendered still or clip has a new ?v=: drop the copies of older renders
    const path = new URL(req.url).pathname;
    for (const old of await cache.keys()) {
      if (new URL(old.url).pathname === path && old.url !== req.url) await cache.delete(old);
    }
  }
  await cache.put(req, res);
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (usable(res)) put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, replaceOlder) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (usable(res)) put(req, res.clone(), replaceOlder);
  return res;
}

async function staleWhileRevalidate(e, req) {
  const hit = await caches.match(req);
  const fresh = fetch(req).then((res) => {
    if (usable(res)) put(req, res.clone());
    return res;
  });
  if (hit) {
    e.waitUntil(fresh.catch(() => {}));
    return hit;
  }
  return fresh;
}
