/* Service worker Tools Video: file tampilan disimpan untuk offline, tapi saat ada internet selalu ambil yang terbaru. */
const VERSI = 'tools-video-v2';   // naikkan angkanya kalau mau membersihkan simpanan lama
const FILE = ['./', './index.html', './stylesheet.css', './javascript.js', './manifest.webmanifest',
  './icons/icon-32.png', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(n => n !== VERSI).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const salin = res.clone(); caches.open(VERSI).then(c => c.put(r, salin)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(hit =>
    hit || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
