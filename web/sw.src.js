/* قصقصه — offline: keeps the app's own files (code, engine, fonts) so it opens and cuts without internet.
   The video never passes through here: only the app's files are cached. */
'use strict';
const CACHE = 'qasqasa-/*VERSION*/';
const FILES = /*FILES*/;
self.addEventListener('install', (e) => {
  // straight from the server: the hosting lets the browser keep files for 10 minutes, and an update must not
  // fill its new cache with the old version's files
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((u) => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('qasqasa-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'update') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
