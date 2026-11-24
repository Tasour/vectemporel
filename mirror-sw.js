/* Miroir API local — sert les réponses extraites de l'API Chronas, sans réseau externe. */
const PREFIX = new URL('./api/v1/', self.location.href).pathname;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function decompress(buffer) {
  if (typeof DecompressionStream === 'undefined') return null;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream, { headers: { 'Content-Type': 'application/json' } });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX)) return;
  let name = url.pathname.slice(PREFIX.length).replace(/^\/+|\/+$/g, '');
  name = name.replace(/[^\w./-]/g, '_');
  const candidates = [`${name}.json.gz`, `${name}.gz`, `${name}.json`, `${name}`];
  event.respondWith((async () => {
    for (const candidate of candidates) {
      const response = await fetch(new URL(`./api/v1/${candidate}`, self.location.href));
      if (!response.ok) continue;
      if (candidate.endsWith('.gz')) {
        const decompressed = decompress(await response.arrayBuffer());
        if (decompressed) return decompressed;
      }
      return response;
    }
    return new Response(JSON.stringify({ error: 'missing local API response', path: name }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  })());
});
