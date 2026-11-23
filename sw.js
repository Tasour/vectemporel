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
  './src/globe/labels.js', './src/timeline/epics.js', './src/timeline/scale.js',
  './src/data/chronas-labels.js', './src/data/modern-labels.js', './src/data/chronas-epics.js',
  './src/data/trails.js', './src/data/turning-points.js', './src/data/anomalies.js', './src/data/data-quality.js', './src/data/histomap.json',
  './src/story/trails.js', './src/globe/simultaneity.js', './src/histomap/stream.js',
  './src/learning/challenges.js', './src/learning/learn-ui.js',
  './src/reports/scrolly.js', './src/reports/scrolly.css', './src/data/reports/dauphine.json',
  './src/data/reports/catholicisme.json', './public/reports/dauphine.html',
  './public/reports/catholicisme.html', './src/histography/index.js', './public/d3-bundle.js',
  './src/learning/review.js', './src/learning/questions.js', './src/learning/srs.js', './src/learning/session.js',
  './src/data/province-timelines/index.js', './src/data/province-timelines/b.js',
  './src/data/years/c1000.json', './src/data/chronas-cities.js', './public/three-bundle.js',
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
  /* Les chunks d'années sont gérés par year-store (cache + repli hors ligne)
   * pour éviter les 400 intermittents de Chromium sur les Request réutilisées. */
  if (url.pathname.includes('/src/data/years/')) return;

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
