/* Libellés historiques projetés sur la sphère. Aucune couche réseau, aucune
 * nouvelle boucle rAF : la mise à jour est pilotée par le tick du globe. */
import { FEATURES } from '../map/data.js';
import { boundsOf } from '../map/projection.js';
import { CHRONAS_LABELS } from '../data/chronas-labels.js';
import { MODERN_LABELS } from '../data/modern-labels.js';

const FEATURE_BY_NAME = new Map(FEATURES.map((feature) => [feature.name, feature]));
const LIMIT = 24;
const MIN_ZOOM = 3;
const DIMENSION_KEYS = ['ruler', 'culture', 'religion', 'capital', 'population'];

function centerOf(feature) {
  const box = boundsOf(feature.rings);
  return {
    lon: (box.minLon + box.maxLon) / 2,
    lat: (box.minLat + box.maxLat) / 2,
  };
}

export function buildLabels(areas, dimension) {
  const dimensionKey = DIMENSION_KEYS.includes(dimension) ? dimension : 'culture';
  const keyIndex = dimensionKey === 'capital' ? 3 : DIMENSION_KEYS.indexOf(dimensionKey);
  if (dimensionKey === 'population') return [];

  const groups = new Map();
  for (const [provinceName, row] of Object.entries(areas || {})) {
    const feature = FEATURE_BY_NAME.get(provinceName);
    if (!feature || !Array.isArray(row)) continue;
    const key = String(row[keyIndex] || '').trim();
    if (!key) continue;
    const center = centerOf(feature);
    if (!groups.has(key)) groups.set(key, { key, count: 0, lon: 0, lat: 0 });
    const group = groups.get(key);
    group.count += 1;
    group.lon += center.lon;
    group.lat += center.lat;
  }

  return [...groups.values()]
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, 'fr'))
    .slice(0, LIMIT)
    .map((group) => {
      const table = CHRONAS_LABELS.names[dimensionKey] || {};
      return {
        key: group.key,
        text: dimensionKey === 'capital' ? group.key : (table[group.key] || group.key),
        lon: group.lon / group.count,
        lat: group.lat / group.count,
        count: group.count,
        kind: dimensionKey === 'capital' ? 'capital' : 'historical',
      };
    });
}

/* P13 : noms de pays modernes (Natural Earth, domaine public), triés par rang. */
export function buildModernLabels(limit = LIMIT) {
  return MODERN_LABELS.countries.slice(0, limit).map((country) => ({
    key: country[1],
    text: country[0],
    lon: country[2],
    lat: country[3],
    kind: 'modern',
  }));
}

export function combineLabels(historical, modern, limit = LIMIT) {
  const half = Math.ceil(limit / 2);
  const seen = new Set();
  const result = [];
  for (const label of [...historical.slice(0, half), ...modern.slice(0, limit - half)]) {
    const key = `${label.kind}:${Math.round(label.lon / 5)}:${Math.round(label.lat / 5)}:${label.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
    if (result.length >= limit) break;
  }
  return result;
}

export function createLabelRenderer(container) {
  let labels = [];
  let nodes = [];

  function setLabels(next) {
    labels = next || [];
    container.replaceChildren();
    nodes = labels.map((label) => {
      const node = document.createElement('span');
      node.className = `globe-label kind-${label.kind || 'historical'}`;
      node.textContent = label.text;
      container.appendChild(node);
      return node;
    });
  }

  function update(project, zoom) {
    const visible = zoom >= MIN_ZOOM;
    container.hidden = !visible || !labels.length;
    if (!visible) return;
    labels.forEach((label, index) => {
      const point = project(label.lon, label.lat);
      const node = nodes[index];
      if (!point.visible) { node.hidden = true; return; }
      node.hidden = false;
      node.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(point.y)}px) translate(-50%, -50%)`;
      node.style.opacity = String(Math.min(1, 0.35 + (zoom - MIN_ZOOM) * 0.3));
    });
  }

  return { setLabels, update, count: () => labels.length };
}

export const LABEL_MODES = Object.freeze([
  { id: 'off', label: 'Aucun' },
  { id: 'historical', label: 'Historique' },
  { id: 'capitals', label: 'Capitales' },
  { id: 'modern', label: 'Moderne' },
  { id: 'both', label: 'Les deux' },
]);
