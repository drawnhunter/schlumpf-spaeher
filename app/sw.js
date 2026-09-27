/* Schlumpf-Späher Service Worker — offline-fähig
   Precache: App-Kern. Alles Weitere (Assets, Sounds) wird beim ersten
   Abruf zwischengespeichert (cache-first). /api geht immer ans Netz. */
'use strict';
const CACHE = 'spaeher-v6-1';
const CORE = [
  '.',
  'index.html',
  'app.js',
  'game.js',
  'jsQR.js',
  'manifest.webmanifest',
  'assets/fonts/Baloo2-var.ttf',
  'assets/schlumpf.png',
  'assets/geraet.png',
  'assets/fernglas.png',
  'assets/falle.png',
  'assets/pilze.png',
  'assets/icons/icon-192.png',
  'giggle.mp3', 'beep.mp3', 'fanfare.mp3', 'sparkle.mp3', 'huch.mp3',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return; // Netz-only
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(resp => {
        if (resp.ok && url.origin === location.origin) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
