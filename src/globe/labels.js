/* Libellés historiques projetés sur la sphère. Aucune couche réseau, aucune
 * nouvelle boucle rAF : la mise à jour est pilotée par le tick du globe. */
import { FEATURES } from '../map/data.js';
import { boundsOf } from '../map/projection.js';
import { CHRONAS_LABELS } from '../data/chronas-labels.js';
import { MODERN_LABELS } from '../data/modern-labels.js';

const FEATURE_BY_NAME = new Map(FEATURES.map((feature) => [feature.name, feature]));
const LIMIT = 40;
const MIN_ZOOM = 1;
const DIMENSION_KEYS = ['ruler', 'culture', 'religion', 'capital', 'population', 'empire'];

const tableOf = (dimension) => CHRONAS_LABELS.names[dimension] || {};

function centerOf(feature) {
  const box = boundsOf(feature.rings);
  return {
    lon: (box.minLon + box.maxLon) / 2,
    lat: (box.minLat + box.maxLat) / 2,
  };
}

export function buildLabels(areas, dimension, zones = null) {
  const dimensionKey = DIMENSION_KEYS.includes(dimension) ? dimension : 'culture';
  const keyIndex = dimensionKey === 'capital' ? 3 : DIMENSION_KEYS.indexOf(dimensionKey);
  if (dimensionKey === 'population' || dimensionKey === 'empire') return [];

  if (zones && zones.length) {
    return zones
      .filter((zone) => zone.value && zone.features.length)
      .sort((a, b) => b.features.length - a.features.length || String(a.value).localeCompare(String(b.value), 'fr'))
      .slice(0, LIMIT)
      .filter((zone) => zone.center.lat >= -85 && zone.center.lat <= 85)
      .map((zone) => ({
        key: zone.value,
        text: dimensionKey === 'capital' ? zone.value : (tableOf(dimensionKey)[zone.value] || zone.value),
        lon: zone.center.lon,
        lat: zone.center.lat,
        count: zone.features.length,
        zone: zone.id,
      }));
  }

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
  const seenText = new Set();
  const result = [];
  for (const label of [...historical.slice(0, half), ...modern.slice(0, limit - half)]) {
    const key = `${label.kind}:${Math.round(label.lon / 5)}:${Math.round(label.lat / 5)}:${label.text}`;
    const textKey = label.text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (seen.has(key) || seenText.has(textKey)) continue;
    seen.add(key);
    seenText.add(textKey);
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
    for (const node of nodes) node.hidden = true;
    const candidates = labels.map((label, index) => ({ label, index, point: project(label.lon, label.lat) }))
      .filter((item) => item.point.visible)
      /* Priorité au groupe le plus étendu, puis ordre alphabétique stable. */
      .sort((a, b) => (b.label.count || 0) - (a.label.count || 0)
        || a.label.text.localeCompare(b.label.text, 'fr'));
    const placed = [];
    let shown = 0;
    for (const { label, index, point } of candidates) {
      const width = 10 + label.text.length * 6.5;
      const height = 18;
      const box = {
        left: point.x - width / 2, right: point.x + width / 2,
        top: point.y - height / 2, bottom: point.y + height / 2,
      };
      const collision = placed.some((other) => box.left < other.right + 4 && box.right > other.left - 4
        && box.top < other.bottom + 3 && box.bottom > other.top - 3);
      if (collision) continue;
      placed.push(box);
      shown += 1;
      const node = nodes[index];
      node.hidden = false;
      node.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(point.y)}px) translate(-50%, -50%)`;
      node.style.opacity = String(Math.min(1, 0.35 + (zoom - MIN_ZOOM) * 0.3));
    }
    container.dataset.visibleLabels = String(shown);
    container.dataset.collisions = String(candidates.length - shown);
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
