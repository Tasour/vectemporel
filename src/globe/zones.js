/* Zones fusionnées : composantes connexes de provinces voisines partageant la
 * même valeur de la dimension active. Aucune dépendance, aucun réseau. */
import { FEATURES } from '../map/data.js';

const KEYS = ['state', 'culture', 'religion', 'capital', 'population'];
function dimensionValue(row, index) {
  if (Array.isArray(row)) return row[index];
  return row?.[KEYS[index] || 'culture'];
}

const keyOf = ([lon, lat]) => `${Math.round(lon * 1000)}:${Math.round(lat * 1000)}`;
export const edgeKey = (a, b) => {
  const x = keyOf(a); const y = keyOf(b);
  return x < y ? `${x}|${y}` : `${y}|${x}`;
};

function ringEdges(rings) {
  const edges = [];
  for (const ring of rings) {
    if (!Array.isArray(ring) || ring.length < 2) continue;
    for (let index = 0; index < ring.length; index += 1) {
      edges.push(edgeKey(ring[index], ring[(index + 1) % ring.length]));
    }
  }
  return edges;
}

const EDGES = FEATURES.map((feature) => ringEdges(feature.rings));

export function computeZones(areas, dimensionIndex) {
  const parent = FEATURES.map((_, index) => index);
  const find = (index) => {
    while (parent[index] !== index) { parent[index] = parent[parent[index]]; index = parent[index]; }
    return index;
  };
  const union = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent[rb] = ra; };

  const values = FEATURES.map((feature) => String(dimensionValue(areas?.[feature.name], dimensionIndex) ?? 'inconnu'));
  const byEdge = new Map();
  EDGES.forEach((edges, index) => {
    for (const edge of edges) {
      if (!byEdge.has(edge)) byEdge.set(edge, []);
      byEdge.get(edge).push(index);
    }
  });
  for (const indexes of byEdge.values()) {
    if (indexes.length < 2) continue;
    for (let i = 1; i < indexes.length; i += 1) {
      if (values[indexes[i]] === values[indexes[0]]) union(indexes[0], indexes[i]);
    }
  }

  const groups = new Map();
  FEATURES.forEach((feature, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, { id: `zone-${root}`, value: values[index], features: [], edges: new Map(), lon: 0, lat: 0 });
    const group = groups.get(root);
    group.features.push(feature.name);
    const ring = feature.rings[0] || [];
    for (const [lon, lat] of ring) { group.lon += Number(lon) || 0; group.lat += Number(lat) || 0; }
    for (const edge of EDGES[index]) group.edges.set(edge, (group.edges.get(edge) || 0) + 1);
  });

  const zones = [...groups.values()].map((group) => {
    const count = group.features.reduce((sum, name) => sum + (featureRingCount(name)), 0);
    return {
      ...group,
      edges: new Set([...group.edges].filter(([, occurrences]) => occurrences === 1).map(([edge]) => edge)),
      center: { lon: group.lon / Math.max(1, count), lat: group.lat / Math.max(1, count) },
      count: group.features.length,
    };
  });
  const byFeature = new Map();
  for (const zone of zones) for (const name of zone.features) byFeature.set(name, zone);
  return { zones, byFeature };
}

function featureRingCount(name) {
  const feature = FEATURES.find((item) => item.name === name);
  return feature?.rings?.length || 1;
}
