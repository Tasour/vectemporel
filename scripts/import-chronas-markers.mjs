#!/usr/bin/env node
/* Import build-time des villes historiques Chronas (endpoint public, CC BY-SA).
 * Sortie compacte et déterministe, aucun réseau au runtime. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './lib/atomic.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'src/data/chronas-cities.js');
const API = process.env.CHRONAS_API || 'https://api.chronas.org';
if (new URL(API).hostname !== 'api.chronas.org') throw new Error('Hôte non autorisé');

const url = new URL('/v1/markers?types=c&year=-5000&end=2100&limit=10000', `${API}/`);
if (url.hostname !== 'api.chronas.org' || url.protocol !== 'https:') throw new Error('URL refusée');
const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const buffer = await response.arrayBuffer();
if (buffer.byteLength > 2_000_000) throw new Error('Réponse trop volumineuse');
const rows = JSON.parse(new TextDecoder().decode(buffer));

const cities = (Array.isArray(rows) ? rows : Object.values(rows))
  .map((row) => {
    const coo = Array.isArray(row.coo) ? row.coo : [];
    const lon = Number(coo[0]);
    const lat = Number(coo[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || !row.name) return null;
    return [
      Math.round(lon * 1000) / 1000,
      Math.round(lat * 1000) / 1000,
      String(row.name),
      Number(row.year) || 0,
      Number(row.end) || 0,
      row.capital ? 1 : 0,
    ];
  })
  .filter(Boolean)
  .sort((a, b) => a[2].localeCompare(b[2], 'fr') || a[3] - b[3]);

const meta = {
  source: 'Chronas',
  license: 'CC BY-SA 4.0',
  endpoint: '/v1/markers?types=c&year=-5000&end=2100&limit=10000',
  retrieved_at: new Date().toISOString().slice(0, 10),
  count: cities.length,
};
const content = `/* Généré par scripts/import-chronas-markers.mjs — NE PAS ÉDITER.\n * Données © Chronas, CC BY-SA 4.0. */\nexport const CHRONAS_CITIES = ${JSON.stringify({ meta, cities })};\n`;
writeFileAtomic(OUT, content);
console.log(`${cities.length} villes, ${(content.length / 1024).toFixed(0)} Ko → ${path.relative(ROOT, OUT)}`);
