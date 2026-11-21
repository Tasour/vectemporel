/* Accès aux données Chronas locales. Aucun appel réseau, aucun aléa. */
import { CHRONAS_MAP } from '../data/chronas-map.js';
import { boundsOf } from './projection.js';

export const MAP_META = Object.freeze({ ...CHRONAS_MAP.meta });
export const FEATURES = CHRONAS_MAP.features;
export const AREAS = CHRONAS_MAP.areas;

export const INDEX = Object.freeze(Object.fromEntries(
  FEATURES.map((feature) => [feature.name, boundsOf(feature.rings)]),
));

const NAMES = [...new Set([...FEATURES.map((feature) => feature.name), ...Object.keys(AREAS)])]
  .sort((a, b) => a.localeCompare(b, 'fr'));

export function searchNames(query, limit = 8) {
  const needle = String(query || '').trim().toLocaleLowerCase('fr');
  if (!needle) return [];
  return NAMES.filter((name) => name.toLocaleLowerCase('fr').includes(needle)).slice(0, limit);
}

export function featureByName(name) {
  return FEATURES.find((feature) => feature.name === name) || null;
}

export function areaByName(name) {
  const row = AREAS[name];
  if (!Array.isArray(row)) return null;
  const [state, culture, religion, capital, population] = row;
  return {
    name,
    state: state || '—',
    culture: culture || '—',
    religion: religion || '—',
    capital: capital || '—',
    population: Number.isFinite(population) ? population : null,
  };
}

export function describe(name) {
  const area = areaByName(name);
  const feature = featureByName(name);
  if (!area && !feature) return null;
  return {
    name,
    ...(area || { name, state: '—', culture: '—', religion: '—', capital: '—', population: null }),
    bounds: feature ? boundsOf(feature.rings) : null,
  };
}

export function colorFor(culture) {
  const key = String(culture || 'inconnu');
  let hash = 7;
  for (let i = 0; i < key.length; i += 1) hash = (Math.imul(hash, 31) + key.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 30%, 30%)`;
}

const POPULATION = new Intl.NumberFormat('fr-FR');
export const formatPopulation = (value) => (value === null ? 'population inconnue' : `${POPULATION.format(value)} habitants`);

export const ATTRIBUTION = 'Données © Chronas · CC BY-SA 4.0 · année 1000';
