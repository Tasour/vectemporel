/* V2-02 — chargement différé des lentilles d'audit.
 * Les 1 000 modules E*.js ne font plus partie du graphe initial : chaque vue
 * charge ses deux passes la première fois qu'elle est rendue, puis réutilise
 * le module en cache. L'ordre d'application (passe 1 puis V2) est préservé. */
const LOADERS = Object.freeze({
  chronology: [
    { viewId: 'chronology', load: () => import('./chronology/index.js') },
    { viewId: 'chronologyv2', load: () => import('./chronology/v2/index.js') },
  ],
  recit: [
    { viewId: 'recit', load: () => import('./recit/index.js') },
    { viewId: 'recitv2', load: () => import('./recit/v2/index.js') },
  ],
  geography: [
    { viewId: 'geography', load: () => import('./geography/index.js') },
    { viewId: 'geographyv2', load: () => import('./geography/v2/index.js') },
  ],
  constellation: [
    { viewId: 'constellation', load: () => import('./constellation/index.js') },
    { viewId: 'constellationv2', load: () => import('./constellation/v2/index.js') },
  ],
  points: [
    { viewId: 'points', load: () => import('./points/index.js') },
    { viewId: 'pointsv2', load: () => import('./points/v2/index.js') },
  ],
});

const cache = new Map();
const latestContext = new Map();

export function runLenses(viewId, ctx) {
  const entries = LOADERS[viewId] || [];
  latestContext.set(viewId, ctx);
  entries.forEach((entry, index) => {
    const key = `${viewId}:${index}`;
    let promise = cache.get(key);
    if (!promise) {
      promise = entry.load().catch((error) => {
        console.warn(`[lentilles] ${key} indisponible :`, error);
        return null;
      });
      cache.set(key, promise);
    }
    promise.then((module) => {
      if (!module || typeof module.runEnhancements !== 'function') return;
      if (latestContext.get(viewId) !== ctx) return; // navigation intervenue : contexte périmé
      module.runEnhancements({ ...ctx, viewId: entry.viewId });
    });
  });
}
