/* Vectemporel — service worker local.
 * Cache-first sur les ressources same-origin : la première visite en ligne
 * remplit le cache, les suivantes fonctionnent hors ligne. Aucune requête
 * cross-origin n'est interceptée ni mise en cache (contrainte zéro réseau). */
const CACHE = 'vectemporel-v7';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './styles.css', './sw.js',
  './src/app.js', './src/map/data.js', './src/map/projection.js',
  './src/globe/globe.js', './src/globe/lonlat.js', './src/globe/texture.js',
  './src/data/chronas-map.js', './src/data/year-store.js',
  './src/data/years/c1000.json', './src/data/chronas-cities.js', './public/three.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE)
    .then((cache) => cache.addAll(SHELL))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key.startsWith('vectemporel-') && key !== CACHE)
      .map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  let url;
  try { url = new URL(request.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.status === 200 && response.type === 'basic') {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
