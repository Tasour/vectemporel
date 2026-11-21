/* Chargement paresseux des timelines provinciales locales.
 * Aucun appel réseau : les chunks sont générés au build et servis localement. */
const MAX_CACHE = 24;
let indexPromise = null;
const cache = new Map();

async function loadIndex() {
  if (!indexPromise) {
    indexPromise = import('./province-timelines/index.js')
      .then((module) => module.PROVINCE_CHUNKS)
      .catch((error) => { indexPromise = null; throw error; });
  }
  return indexPromise;
}

export async function getProvinceTimeline(name) {
  if (!name) return null;
  if (cache.has(name)) return cache.get(name);
  const index = await loadIndex();
  const file = index[name];
  if (!file) return null;
  const module = await import(`./province-timelines/${file}`);
  const timeline = module.PROVINCE_TIMELINES?.[name] || null;
  cache.set(name, timeline);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  return timeline;
}

export function valueAt(timeline, dimension, year) {
  const entries = timeline?.[dimension];
  if (!Array.isArray(entries) || !entries.length) return null;
  let current = null;
  for (const [entryYear, value] of entries) {
    if (entryYear > year) break;
    current = value;
  }
  return current;
}

export function transitionsAround(timeline, dimension, from, to, limit = 12) {
  const entries = timeline?.[dimension];
  if (!Array.isArray(entries)) return [];
  return entries
    .filter(([year]) => year >= from && year <= to)
    .slice(-limit);
}

export function clearProvinceTimelineCache() {
  cache.clear();
}
