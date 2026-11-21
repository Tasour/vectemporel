/* Texture de fond équirectangulaire locale : océan + graticule uniquement.
 * Le détail des provinces est porté par le maillage vectoriel (ADR-0007).
 * Aucun binaire, aucun réseau, résultat déterministe. */
import { pixelsFromLonLat } from './lonlat.js';

export const DIMENSIONS = Object.freeze([
  { id: 'ruler', label: 'État', index: 0 },
  { id: 'culture', label: 'Culture', index: 1 },
  { id: 'religion', label: 'Religion', index: 2 },
  { id: 'capital', label: 'Capitale', index: 3 },
  { id: 'population', label: 'Population', index: 4 },
]);

/* La géométrie vectorielle ne dépend plus de la résolution du raster. */
const HIGH = { width: 2048, height: 1024, segments: [192, 128] };
const LOW = { width: 1024, height: 512, segments: [96, 64] };

export function globeQuality() {
  const memory = navigator.deviceMemory || 8;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches || false;
  return memory >= 4 && !coarse ? HIGH : LOW;
}

export function createEquirectangularCanvas(quality = globeQuality()) {
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
  return canvas;
}

export function createGlobeTexture(THREE, quality = globeQuality(), renderer = null) {
  const canvas = createEquirectangularCanvas(quality);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(16, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  return { texture, canvas };
}
