/* Reconstruction des régions pour chaque année de -2000 à 2000.
 * Données chargées depuis des chunks locaux, aucun appel réseau externe.
 * Le chargement est paresseux et mis en cache (LRU simple par année). */
import { CHRONAS_MAP } from './chronas-map.js';

const MIN = CHRONAS_MAP.meta.minYear ?? -2000;
const MAX = CHRONAS_MAP.meta.maxYear ?? 2000;
const chunks = new Map();
const years = new Map();
const MAX_YEARS = 12;

export const clampYear = (year) => {
  const value = Number(year);
  return Number.isFinite(value) ? Math.max(MIN, Math.min(MAX, Math.round(value))) : 1000;
};
export const centuryStart = (year) => MIN + Math.floor((clampYear(year) - MIN) / 100) * 100;

/* Pur et testable : reconstruit l'état d'une année depuis un chunk. */
export function reconstruct(chunk, year) {
  const target = clampYear(year);
  if (!chunk || chunk.start > target || target >= chunk.start + 100) {
    throw new Error(`Année ${target} hors du chunk ${chunk?.start}`);
  }
  const result = {};
  for (const [name, row] of Object.entries(chunk.base || {})) result[name] = row;
  for (let current = chunk.start + 1; current <= target; current += 1) {
    for (const [name, row] of chunk.deltas?.[String(current)] || chunk.deltas?.[current] || []) {
      if (row === null) delete result[name];
      else result[name] = row;
    }
  }
  return result;
}

const CHUNK_CACHE = 'chronas-year-chunks';

async function cachedChunk(url) {
  return caches.match(url.href).catch(() => null);
}

async function loadChunk(start) {
  if (chunks.has(start)) return chunks.get(start);
  const url = new URL(`./src/data/years/c${start}.json`, document.baseURI);
  let response = null;
  if (navigator.onLine !== false) {
    try {
      response = await fetch(url);
    } catch { /* repli cache ci-dessous */ }
  }
  if (response?.ok) {
    const chunk = await response.json();
    chunks.set(start, chunk);
    caches.open(CHUNK_CACHE)
      .then((cache) => cache.put(url.href, new Response(JSON.stringify(chunk), {
        headers: { 'Content-Type': 'application/json' },
      })))
      .catch(() => { /* cache best-effort */ });
    return chunk;
  }
  const cached = await cachedChunk(url);
  if (cached) {
    const chunk = await cached.json();
    chunks.set(start, chunk);
    return chunk;
  }
  throw new Error(`Chunk ${start} indisponible (HTTP ${response?.status || 'réseau'})`);
}

export async function getAreasForYear(year) {
  const target = clampYear(year);
  if (years.has(target)) return years.get(target);
  const chunk = await loadChunk(centuryStart(target));
  const areas = reconstruct(chunk, target);
  years.set(target, areas);
  if (years.size > MAX_YEARS) years.delete(years.keys().next().value);
  return areas;
}

export const peekYear = (year) => years.get(clampYear(year)) || null;
export function clearYearCache() { years.clear(); chunks.clear(); }
