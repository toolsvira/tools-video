/* Service worker Tools Video: hanya menyimpan file tampilan supaya bisa dibuka tanpa internet. */
const VERSI = 'tools-video-v1';   // naikkan angkanya setiap file tampilan berubah
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
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => hit || fetch(r).catch(() =>
    r.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
