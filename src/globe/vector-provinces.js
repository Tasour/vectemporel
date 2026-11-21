/* Maillage vectoriel des provinces historiques sur la sphère.
 * Remplace le dessin raster des frontières : netteté indépendante du zoom.
 * Zéro réseau, déterminisme strict, aucune aléa. */
import { FEATURES, AREAS, colorFor } from '../map/data.js';
import { normalizeLongitude, vectorFromLonLat } from './lonlat.js';

const RADIUS = 1.003;
const EDGE_RADIUS = 1.004;

export const ZOOM_MAX = 6;

function normalizedRing(ring) {
  const clean = ring
    .filter((point) => Array.isArray(point) && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])))
    .map(([lon, lat]) => [Number(lon), Number(lat)]);
  if (clean.length > 1 && clean[0][0] === clean[clean.length - 1][0]
    && clean[0][1] === clean[clean.length - 1][1]) clean.pop();
  if (clean.length < 3) return null;
  const reference = clean.reduce((sum, point) => sum + point[0], 0) / clean.length;
  return clean.map(([lon, lat]) => [reference + normalizeLongitude(lon - reference), lat]);
}

export function dimensionValue(row, index) {
  if (Array.isArray(row)) return row[index];
  const keys = ['state', 'culture', 'religion', 'capital', 'population'];
  return row?.[keys[index]];
}

/* Pur et testable : produit les tableaux de géométrie sans dépendre de THREE. */
export function buildProvinceData(areas, dimensionIndex, THREE) {
  const positions = [];
  const colors = [];
  const indices = [];
  const edges = [];
  let triangles = 0;
  let skipped = 0;

  for (const feature of FEATURES) {
    const value = dimensionValue(areas?.[feature.name], dimensionIndex);
    const color = new THREE.Color(colorFor(String(value ?? 'inconnu')));
    for (const rawRing of feature.rings) {
      const ring = normalizedRing(rawRing);
      if (!ring) { skipped += 1; continue; }
      const contour = ring.map(([lon, lat]) => new THREE.Vector2(lon, lat));
      let faces;
      try {
        faces = THREE.ShapeUtils.triangulateShape(contour, []);
      } catch {
        skipped += 1;
        continue;
      }
      if (!faces.length) { skipped += 1; continue; }
      const offset = positions.length / 3;
      for (const [lon, lat] of ring) {
        const point = vectorFromLonLat(lon, lat, RADIUS);
        positions.push(point.x, point.y, point.z);
        colors.push(color.r, color.g, color.b);
      }
      for (const face of faces) {
        for (const index of face) indices.push(offset + index);
        triangles += 1;
      }
      for (let index = 0; index < ring.length; index += 1) {
        const [lonA, latA] = ring[index];
        const [lonB, latB] = ring[(index + 1) % ring.length];
        const a = vectorFromLonLat(lonA, latA, EDGE_RADIUS);
        const b = vectorFromLonLat(lonB, latB, EDGE_RADIUS);
        edges.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
  }
  return { positions, colors, indices, edges, triangles, skipped };
}

export function createProvinceMesh(THREE, areas, dimensionIndex) {
  const data = buildProvinceData(areas, dimensionIndex, THREE);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
  geometry.setIndex(data.indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshPhongMaterial({
    vertexColors: true, shininess: 0, specular: 0x000000, side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geometry, material);

  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(data.edges, 3));
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x0a0f16, transparent: true, opacity: 0.6,
  });
  const lines = new THREE.LineSegments(edgeGeometry, edgeMaterial);

  const group = new THREE.Group();
  group.add(mesh, lines);
  return {
    group,
    statistics: { triangles: data.triangles, skipped: data.skipped, vertices: data.positions.length / 3 },
    dispose() {
      geometry.dispose();
      material.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
    },
  };
}

export const DEFAULT_AREAS = AREAS;
