/* Miroir API local — sert les réponses extraites de l'API Chronas, sans réseau externe. */
const PREFIX = new URL('./api/v1/', self.location.href).pathname;
const BUILD_VERSION = '37f140a958';
const CACHE_NAME = `vectemporel-api-${BUILD_VERSION}`;
const CACHE_PREFIX = 'vectemporel-api-';
const MAX_DECOMPRESSED_CACHE = 12;
const decompressedCache = new Map();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names
    .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
    .map((name) => caches.delete(name)));
  decompressedCache.clear();
  await self.clients.claim();
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'VECTEMPOREL_CACHE_RESET', version: BUILD_VERSION });
  }
})()));

function decompress(buffer) {
  if (typeof DecompressionStream === 'undefined') return null;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream, { headers: { 'Content-Type': 'application/json' } });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Pack binaire de l'atlas : cache-first, disponible hors ligne.
  if (url.origin === self.location.origin && url.pathname.includes('/atlas-pack/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }
  if (url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX)) return;
  let name = url.pathname.slice(PREFIX.length).replace(/^\/+|\/+$/g, '');
  const query = url.search.replace(/^\?/, '');
  if (query) name = `${name}?${query}`;
  const safe = name.replace(/[^\w./-]/g, '_');
  const key = name.startsWith('areas/') ? name : `raw/${safe}`;
  const candidates = [`${key}.json.gz`, `${key}.gz`, `${key}.json`, `${key}`, `${name}`];
  if (name.startsWith('markers')) {
    const base = name.split('?')[0];
    const year = new URLSearchParams(url.search).get('year');
    if (year) candidates.push(`raw/${base}_year_${year}`, `raw/${base}_year_${year}.json`);
  }
  event.respondWith((async () => {
    for (const candidate of candidates) {
      const response = await fetch(new URL(`./api/v1/${candidate}`, self.location.href));
      if (!response.ok) continue;
      if (candidate.endsWith('.gz')) {
        const cached = decompressedCache.get(candidate);
        if (cached) {
          return new Response(cached, { headers: { 'Content-Type': 'application/json' } });
        }
        const decompressed = decompress(await response.arrayBuffer());
        if (decompressed) {
          const text = await decompressed.text();
          decompressedCache.set(candidate, text);
          while (decompressedCache.size > MAX_DECOMPRESSED_CACHE) {
            decompressedCache.delete(decompressedCache.keys().next().value);
          }
          return new Response(text, { headers: { 'Content-Type': 'application/json' } });
        }
      }
      return response;
    }
    return new Response(JSON.stringify({ error: 'missing local API response', path: name }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  })());
});
