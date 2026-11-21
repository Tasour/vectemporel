#!/usr/bin/env node
/* Import borné et déterministe de données Chronas (CC BY-SA 4.0).
 * Exécution AU BUILD UNIQUEMENT : le runtime reste zéro réseau.
 * Limites : host allowlisté, timeout, plafond d'octets, nombre d'années et
 * d'enregistrements bornés, tri déterministe, aucune écriture hors snapshot. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './lib/atomic.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const API = process.env.CHRONAS_API || 'https://api.chronas.org';
const OUT = path.join(ROOT, 'src/data/chronas-snapshot.js');
const ALLOWED = new URL(API).hostname === 'api.chronas.org';
const TIMEOUT_MS = 20_000;
const MAX_BYTES = 2_000_000;
const MAX_AREAS = 200;
const MAX_MARKERS = 300;
const DEFAULT_YEARS = [-1000, -500, 0, 500, 1000, 1200, 1500, 1800, 1900, 2000];

if (!ALLOWED) {
  console.error('Hôte Chronas non autorisé');
  process.exit(1);
}

const years = (process.env.CHRONAS_YEARS || DEFAULT_YEARS.join(','))
  .split(',').map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value >= -15000 && value <= 2100);
if (!years.length) throw new Error('Aucune année valide');

async function getJson(resource) {
  const url = new URL(resource, `${API}/`);
  if (url.hostname !== 'api.chronas.org' || url.protocol !== 'https:') throw new Error(`URL refusée : ${url}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'error' });
  if (!response.ok) throw new Error(`HTTP ${response.status} pour ${url.pathname}`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) throw new Error(`Réponse trop volumineuse (${buffer.byteLength} o) : ${url.pathname}`);
  return JSON.parse(new TextDecoder().decode(buffer));
}

const round3 = (value) => Math.round(Number(value) * 1000) / 1000;
const snapshot = { meta: {
  source: 'Chronas',
  url: 'https://chronas.org',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  retrieved_at: new Date().toISOString().slice(0, 10),
  api_version: 'inconnue',
  years: years.slice(),
}, years: {} };

try {
  const version = await getJson('/v1/version');
  snapshot.meta.api_version = String(version.version || 'inconnue');
} catch (error) {
  console.warn(`[chronas] version indisponible : ${error.message}`);
}

for (const year of years) {
  try {
    const [areas, markers] = await Promise.all([
      getJson(`/v1/areas/${year}`),
      getJson(`/v1/markers?year=${year}`),
    ]);
    const areaRows = Object.entries(areas || {})
      .map(([name, row]) => [name, ...(Array.isArray(row) ? row : [])])
      .sort((a, b) => (Number(b[5]) || 0) - (Number(a[5]) || 0) || String(a[0]).localeCompare(String(b[0])))
      .slice(0, MAX_AREAS);
    const markerRows = (Array.isArray(markers) ? markers : [])
      .map((item) => [
        Array.isArray(item.coo) ? item.coo.map(round3) : null,
        Number(item.year) || null,
        Number(item.end) || null,
        String(item.name || ''),
        String(item.type || ''),
      ])
      .filter((row) => row[3])
      .sort((a, b) => a[3].localeCompare(b[3]) || (a[1] || 0) - (b[1] || 0))
      .slice(0, MAX_MARKERS);
    snapshot.years[String(year)] = { areas: areaRows, markers: markerRows };
    console.log(`${year}: ${areaRows.length} aires, ${markerRows.length} marqueurs`);
  } catch (error) {
    console.warn(`[chronas] année ${year} ignorée : ${error.message}`);
  }
}

if (!Object.keys(snapshot.years).length) throw new Error('Aucune donnée importée');
const content = `/* Généré par scripts/import-chronas.mjs — NE PAS ÉDITER.
 * Données © Chronas, CC BY-SA 4.0. Voir DATA-LICENSE.md et ATTRIBUTION.md. */
export const CHRONAS_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)};\n`;
writeFileAtomic(OUT, content);
console.log(`Snapshot écrit : ${path.relative(ROOT, OUT)}`);
