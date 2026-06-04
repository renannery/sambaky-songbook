// SambaKY Songbook - service worker (offline cache)
// manter em sincronia com APP_VERSION no index.html
const CACHE = 'sambaky-songbook-2026.06.04-1544';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './render.js', './songs.json', './logo-src.svg',
                './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');
  // conteúdo (songs.json) e código (render.js): network-first pra atualização chegar na hora
  const isCore = url.pathname.endsWith('songs.json') || url.pathname.endsWith('render.js');

  if (isHTML || isCore) {
    // network-first: always try the fresh version, fall back to cache offline
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return resp;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // other assets: stale-while-revalidate
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
