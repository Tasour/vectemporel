/* Conversions lon/lat <-> vecteur 3D et pixels de texture. Fonctions pures.
 * Convention alignée sur THREE.SphereGeometry (phiStart=0, thetaStart=0) :
 *   u = (lon + 180) / 360,  v = (lat + 90) / 180
 * Le pôle nord correspond au haut de la texture équirectangulaire. */

const DEG = Math.PI / 180;

export const clampLatitude = (lat) => Math.min(85, Math.max(-85, Number(lat) || 0));
export const normalizeLongitude = (lon) => {
  let value = Number(lon) || 0;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
};

export function vectorFromLonLat(lon, lat, radius = 1) {
  const phi = (normalizeLongitude(lon) + 180) * DEG;
  const theta = (90 - clampLatitude(lat)) * DEG;
  const sinTheta = Math.sin(theta);
  return {
    x: -radius * Math.cos(phi) * sinTheta,
    y: radius * Math.cos(theta),
    z: radius * Math.sin(phi) * sinTheta,
  };
}

export function lonLatFromVector(vector) {
  const { x, y, z } = vector;
  const radius = Math.hypot(x, y, z) || 1;
  const lat = 90 - Math.acos(Math.min(1, Math.max(-1, y / radius))) / DEG;
  const lon = Math.atan2(z, -x) / DEG - 180;
  return { lon: normalizeLongitude(lon), lat };
}

export function pixelsFromLonLat(lon, lat, width, height) {
  return {
    x: ((normalizeLongitude(lon) + 180) / 360) * width,
    y: ((90 - clampLatitude(lat)) / 180) * height,
  };
}

export function centerOfBounds(bounds) {
  return {
    lon: (bounds.minLon + bounds.maxLon) / 2,
    lat: (bounds.minLat + bounds.maxLat) / 2,
  };
}
