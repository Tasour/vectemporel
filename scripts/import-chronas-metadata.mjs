#!/usr/bin/env node
/* Import build-time des libellés Chronas (noms d'entités). Données CC BY-SA 4.0.
 * Aucun appel réseau au runtime, aucun poster, aucune URL distante conservée. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './lib/atomic.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'src/data/chronas-labels.js');
const API = process.env.CHRONAS_API || 'https://api.chronas.org';
if (new URL(API).hostname !== 'api.chronas.org') throw new Error('Hôte non autorisé');

const url = new URL('/v1/metadata?type=g&f=provinces,ruler,culture,religion,capital,province,religionGeneral', `${API}/`);
if (url.hostname !== 'api.chronas.org' || url.protocol !== 'https:') throw new Error('URL refusée');
const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const buffer = await response.arrayBuffer();
if (buffer.byteLength > 2_000_000) throw new Error('Réponse trop volumineuse');
const raw = JSON.parse(new TextDecoder().decode(buffer));

const sorted = (entries) => Object.fromEntries(
  [...entries].sort(([a], [b]) => a.localeCompare(b, 'fr')),
);

const names = {};
for (const dimension of ['religion', 'religionGeneral', 'culture', 'ruler']) {
  names[dimension] = sorted(Object.entries(raw[dimension] || {})
    .filter(([, value]) => Array.isArray(value) && value[0])
    .map(([key, value]) => [key, String(value[0])]));
}
names.province = sorted(Object.entries(raw.province || {})
  .filter(([, value]) => typeof value === 'string' && value)
  .map(([key, value]) => [key, value]));

const version = await fetch(`${API}/v1/version`, { signal: AbortSignal.timeout(10000) })
  .then((r) => r.json())
  .catch(() => ({ version: 'inconnue' }));

const snapshot = {
  meta: {
    source: 'Chronas',
    license: 'CC BY-SA 4.0',
    endpoint: url.pathname + url.search,
    retrieved_at: new Date().toISOString().slice(0, 10),
    api_version: String(version.version || 'inconnue'),
  },
  names,
};
const content = `/* Généré par scripts/import-chronas-metadata.mjs — NE PAS ÉDITER.\n * Données © Chronas, CC BY-SA 4.0. */\nexport const CHRONAS_LABELS = ${JSON.stringify(snapshot)};\n`;
writeFileAtomic(OUT, content);
console.log(`libellés : ${Object.values(names).reduce((sum, map) => sum + Object.keys(map).length, 0)} noms, ${(content.length / 1024).toFixed(0)} Ko`);
