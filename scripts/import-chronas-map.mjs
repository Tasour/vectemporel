#!/usr/bin/env node
/* Carte mondiale locale — build-time uniquement, zéro réseau au runtime.
 * Sources : Chronas (CC BY-SA 4.0). Aucun code du frontend Chronas n'est copié.
 * Sortie déterministe : régions triées, géométrie simplifiée, coordonnées arrondies. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './lib/atomic.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'src/data/chronas-map.js');
const API = process.env.CHRONAS_API || 'https://api.chronas.org';
const YEAR = Number(process.env.CHRONAS_YEAR || 1000);
const TIMEOUT_MS = 20000;
const MAX_BYTES = 5_000_000;
const TOLERANCE = Number(process.env.CHRONAS_SIMPLIFY || 0.05);
if (new URL(API).hostname !== 'api.chronas.org') throw new Error('Hôte non autorisé');
if (!Number.isInteger(YEAR) || YEAR < -15000 || YEAR > 2100) throw new Error('Année invalide');

async function getJson(resource) {
  const url = new URL(resource, `${API}/`);
  if (url.hostname !== 'api.chronas.org' || url.protocol !== 'https:') throw new Error(`URL refusée : ${url}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'error' });
  if (!response.ok) throw new Error(`HTTP ${response.status} : ${url.pathname}`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) throw new Error(`Réponse trop volumineuse : ${buffer.byteLength} o`);
  return JSON.parse(new TextDecoder().decode(buffer));
}

const round3 = (value) => Math.round(Number(value) * 1000) / 1000;

function perpendicular(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1,
    ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function simplify(points, tolerance) {
  if (points.length <= 4) return points;
  let index = -1;
  let distance = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicular(points[i], points[0], points[points.length - 1]);
    if (d > distance) { distance = d; index = i; }
  }
  if (index < 0 || distance <= tolerance) return [points[0], points[points.length - 1]];
  const left = simplify(points.slice(0, index + 1), tolerance);
  const right = simplify(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

function ringsOf(geometry) {
  if (!geometry) return [];
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  const rings = [];
  for (const polygon of polygons) {
    const list = Array.isArray(polygon?.[0]?.[0]) ? polygon : [polygon];
    for (const ring of list) {
      if (!Array.isArray(ring)) continue;
      const points = ring
        .filter((point) => Array.isArray(point)
          && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])))
        .map((point) => [round3(point[0]), round3(point[1])]);
      const simplified = simplify(points, TOLERANCE);
      if (simplified.length >= 3) rings.push(simplified);
    }
  }
  return rings;
}

const [areas, metadata] = await Promise.all([
  getJson(`/v1/areas/${YEAR}`),
  getJson('/v1/metadata?type=g&f=provinces'),
]);
const version = await getJson('/v1/version').catch(() => ({ version: 'inconnue' }));

const areaEntries = Object.entries(areas || {})
  .filter(([name, row]) => name && Array.isArray(row))
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([name, row]) => [name, row.slice(0, 5)]);

const features = (metadata.provinces?.features || [])
  .map((feature) => ({ name: String(feature.properties?.name || ''), rings: ringsOf(feature.geometry) }))
  .filter((feature) => feature.name && feature.rings.length)
  .sort((a, b) => a.name.localeCompare(b.name));

const snapshot = {
  meta: {
    source: 'Chronas',
    url: 'https://chronas.org',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    retrieved_at: new Date().toISOString().slice(0, 10),
    api_version: String(version.version || 'inconnue'),
    year: YEAR,
    tolerance: TOLERANCE,
    areas: areaEntries.length,
    features: features.length,
  },
  areas: Object.fromEntries(areaEntries),
  features,
};

const content = `/* Généré par scripts/import-chronas-map.mjs — NE PAS ÉDITER.
 * Données © Chronas, CC BY-SA 4.0. Voir DATA-LICENSE.md et ATTRIBUTION.md. */
export const CHRONAS_MAP = ${JSON.stringify(snapshot)};\n`;
writeFileAtomic(OUT, content);
console.log(`${areaEntries.length} régions, ${features.length} géométries, ${(content.length / 1024).toFixed(0)} Ko → ${path.relative(ROOT, OUT)}`);
