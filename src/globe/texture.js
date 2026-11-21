/* Texture équirectangulaire générée localement depuis les polygones Chronas.
 * Aucun binaire, aucun réseau, résultat déterministe. */
import { AREAS, FEATURES, colorFor } from '../map/data.js';
import { pixelsFromLonLat } from './lonlat.js';

/* Dimensions de couleur (F21) : index dans la ligne Chronas. */
export const DIMENSIONS = Object.freeze([
  { id: 'ruler', label: 'État', index: 0 },
  { id: 'culture', label: 'Culture', index: 1 },
  { id: 'religion', label: 'Religion', index: 2 },
  { id: 'capital', label: 'Capitale', index: 3 },
  { id: 'population', label: 'Population', index: 4 },
]);

/* Définition haute (ADR-0006) avec repli automatique sur appareil peu mémoire. */
const HIGH = { width: 4096, height: 2048, segments: [192, 128] };
const LOW = { width: 2048, height: 1024, segments: [96, 64] };

export function globeQuality() {
  const memory = navigator.deviceMemory || 8;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches || false;
  return memory >= 4 && !coarse ? HIGH : LOW;
}

const COLORS = new Map();
for (const feature of FEATURES) {
  const culture = AREAS[feature.name]?.[1];
  if (!COLORS.has(culture)) COLORS.set(culture, colorFor(culture));
}

export function createEquirectangularCanvas(quality = globeQuality(), areas = AREAS, dimension = 'culture') {
  const { width: WIDTH, height: HEIGHT } = quality;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  const ocean = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  ocean.addColorStop(0, '#0a1420');
  ocean.addColorStop(0.5, '#0d1a29');
  ocean.addColorStop(1, '#0a1420');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(255,255,255,.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let lon = -180; lon <= 180; lon += 30) {
    const { x } = pixelsFromLonLat(lon, 0, WIDTH, HEIGHT);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const { y } = pixelsFromLonLat(0, lat, WIDTH, HEIGHT);
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
  }
  ctx.stroke();

  paintFeatures(ctx, WIDTH, HEIGHT, areas, dimension);
  return canvas;
}

function paintFeatures(ctx, WIDTH, HEIGHT, areas, dimension = 'culture') {
  const dimensionIndex = DIMENSIONS.find((item) => item.id === dimension)?.index ?? 1;
  for (const feature of FEATURES) {
    ctx.beginPath();
    for (const ring of feature.rings) {
      ring.forEach(([lon, lat], index) => {
        const point = pixelsFromLonLat(lon, lat, WIDTH, HEIGHT);
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
    }
    const row = areas[feature.name];
    const value = Array.isArray(row) ? row[dimensionIndex] : row?.[DIMENSIONS[dimensionIndex].id];
    const color = colorFor(String(value ?? 'inconnu'));
    ctx.fillStyle = color || '#263345';
    ctx.fill();
  }
}

export function createGlobeTexture(THREE, quality = globeQuality(), renderer = null) {
  const canvas = createEquirectangularCanvas(quality);
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(16, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  let currentDimension = 'culture';
  let currentAreas = AREAS;
  const repaint = (areas = currentAreas, dimension = currentDimension) => {
    currentAreas = areas;
    currentDimension = dimension;
    paintFeatures(ctx, canvas.width, canvas.height, areas, dimension);
    texture.needsUpdate = true;
  };
  return { texture, canvas, repaint };
}
