// SMG — service worker (funzionamento offline)
const CACHE = 'smg-org-v37';
const FILES = ['./', './index.html', './engine.js', './app.js', './app.webmanifest', './icon-192-v2.png', './icon-512-v2.png',
  './icon-maskable-512-v2.png', './apple-touch-icon-v2.png', './logo-v2.png',
  './fonts/poppins-regular.woff', './fonts/poppins-medium.woff', './fonts/poppins-bold.woff', './fonts/poppins-bolditalic.woff'];

self.addEventListener('install', e => {
  // cache: 'reload' = file presi sempre dal server, non dalla cache del browser (altrimenti la versione nuova poteva installarsi con file vecchi)
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Solo i file dell'app: rete prima (aggiornamenti immediati), cache se offline.
// Le chiamate a Intervals.icu e al meteo passano direttamente.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })   // ricontrolla sempre col server (risposta leggera se il file non è cambiato)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
