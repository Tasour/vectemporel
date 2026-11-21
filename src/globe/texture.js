/* Texture équirectangulaire générée localement depuis les polygones Chronas.
 * Aucun binaire, aucun réseau, résultat déterministe. */
import { AREAS, FEATURES, colorFor } from '../map/data.js';
import { pixelsFromLonLat } from './lonlat.js';

const WIDTH = 2048;
const HEIGHT = 1024;

const COLORS = new Map();
for (const feature of FEATURES) {
  const culture = AREAS[feature.name]?.[1];
  if (!COLORS.has(culture)) COLORS.set(culture, colorFor(culture));
}

export function createEquirectangularCanvas() {
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
    ctx.fillStyle = COLORS.get(AREAS[feature.name]?.[1]) || '#263345';
    ctx.fill();
  }
  return canvas;
}

export function createGlobeTexture(THREE) {
  const canvas = createEquirectangularCanvas();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  return texture;
}
