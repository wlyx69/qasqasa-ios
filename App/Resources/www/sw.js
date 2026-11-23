/* قصقصه — offline: keeps the app's own files (code, engine, fonts) so it opens and cuts without internet.
   The video never passes through here: only the app's files are cached. */
'use strict';
const CACHE = 'qasqasa-2f1fc012ad3b';
const FILES = ["./", "app.css", "app.js", "apple-touch-icon.png", "cut-worker.js", "engine-client.js", "engine.js", "favicon.svg", "fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2", "fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2", "fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2", "fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2", "fonts/ibm-plex-sans-arabic-latin-400-normal.woff2", "fonts/ibm-plex-sans-arabic-latin-500-normal.woff2", "fonts/ibm-plex-sans-arabic-latin-600-normal.woff2", "fonts/ibm-plex-sans-arabic-latin-700-normal.woff2", "index.html", "save.js", "vendor/mediabunny.js", "zip.js"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
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
