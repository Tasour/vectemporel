/* Projection Web Mercator pure et déterministe. Aucune dépendance, aucun état.
 * Le format `pos` est celui de Chronas : latitude, longitude, zoom. */

const MAX_LAT = 85.05112878;
const TILE = 512;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function clampView(view) {
  return {
    lat: clamp(Number(view.lat) || 0, -MAX_LAT, MAX_LAT),
    lon: clamp(Number(view.lon) || 0, -180, 180),
    zoom: clamp(Number(view.zoom) || 0, 0, 8),
  };
}

export function toWorld(lon, lat) {
  const phi = clamp(lat, -MAX_LAT, MAX_LAT) * Math.PI / 180;
  const x = (clamp(lon, -180, 180) + 180) / 360;
  const y = (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2;
  return [x, y];
}

export function fromWorld(x, y) {
  const lon = x * 360 - 180;
  const n = Math.PI * (1 - 2 * y);
  const lat = Math.atan(Math.sinh(n)) * 180 / Math.PI;
  return [lon, lat];
}

export const scaleAt = (zoom) => TILE * 2 ** clamp(zoom, 0, 8);

export function project(lon, lat, view, size) {
  const scale = scaleAt(view.zoom);
  const [wx, wy] = toWorld(lon, lat);
  const [cx, cy] = toWorld(view.lon, view.lat);
  return [
    (wx - cx) * scale + size.w / 2,
    (wy - cy) * scale + size.h / 2,
  ];
}

export function unproject(x, y, view, size) {
  const scale = scaleAt(view.zoom);
  const [cx, cy] = toWorld(view.lon, view.lat);
  return fromWorld(cx + (x - size.w / 2) / scale, cy + (y - size.h / 2) / scale);
}

export function decodePos(value) {
  if (typeof value !== 'string') return null;
  const parts = value.split(',').map((part) => Number(part.trim()));
  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return clampView({ lat: parts[0], lon: parts[1], zoom: parts[2] });
}

export const encodePos = (view) => `${view.lat.toFixed(6)},${view.lon.toFixed(6)},${view.zoom.toFixed(2)}`;

export function panPixels(view, dx, dy) {
  const scale = scaleAt(view.zoom);
  const [x, y] = toWorld(view.lon, view.lat);
  const [lon, lat] = fromWorld(x - dx / scale, y - dy / scale);
  return clampView({ lat, lon, zoom: view.zoom });
}

export function zoomAt(view, factor, anchor, size) {
  const zoom = clamp(view.zoom + factor, 0, 8);
  if (zoom === view.zoom) return view;
  const before = unproject(anchor[0], anchor[1], view, size);
  const next = { ...view, zoom };
  const after = unproject(anchor[0], anchor[1], next, size);
  return clampView({ lon: view.lon + before[0] - after[0], lat: view.lat + before[1] - after[1], zoom });
}

export function boundsOf(rings) {
  let minLon = 180;
  let maxLon = -180;
  let minLat = 90;
  let maxLat = -90;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return { minLon, maxLon, minLat, maxLat };
}

export function fitBounds(bounds, size, padding = 40) {
  const width = Math.max(1, size.w - padding * 2);
  const height = Math.max(1, size.h - padding * 2);
  const [x0, y0] = toWorld(bounds.minLon, bounds.maxLat);
  const [x1, y1] = toWorld(bounds.maxLon, bounds.minLat);
  const zoomX = Math.log2(width / (Math.max(1e-6, x1 - x0) * TILE));
  const zoomY = Math.log2(height / (Math.max(1e-6, y1 - y0) * TILE));
  const [cx, cy] = toWorld((bounds.minLon + bounds.maxLon) / 2, (bounds.minLat + bounds.maxLat) / 2);
  const [lon, lat] = fromWorld(cx, cy);
  return clampView({ lat, lon, zoom: clamp(Math.min(zoomX, zoomY), 0, 8) });
}

export function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInFeature(lon, lat, feature, index) {
  const box = index[feature.name];
  if (box && (lon < box.minLon || lon > box.maxLon || lat < box.minLat || lat > box.maxLat)) return false;
  return feature.rings.some((ring) => pointInRing(lon, lat, ring));
}
