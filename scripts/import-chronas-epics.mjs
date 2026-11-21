#!/usr/bin/env node
/* Import build-time des épiques Chronas (guerres, empires…). Données CC BY-SA 4.0.
 * Format compact : [id, titre, début, fin, sous-type, wiki]. Aucun poster. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './lib/atomic.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'src/data/chronas-epics.js');
const API = process.env.CHRONAS_API || 'https://api.chronas.org';
if (new URL(API).hostname !== 'api.chronas.org') throw new Error('Hôte non autorisé');

const url = new URL('/v1/metadata?type=e&end=3000&subtype=ew,ei,ps', `${API}/`);
if (url.hostname !== 'api.chronas.org' || url.protocol !== 'https:') throw new Error('URL refusée');
const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const buffer = await response.arrayBuffer();
if (buffer.byteLength > 2_000_000) throw new Error('Réponse trop volumineuse');
const raw = JSON.parse(new TextDecoder().decode(buffer));

const epics = (Array.isArray(raw) ? raw : [])
  .map((item) => ({
    id: String(item._id || item.wiki || ''),
    title: String(item.data?.title || item.wiki || ''),
    start: Number(item.data?.start ?? item.year ?? 0),
    end: Number(item.data?.end ?? 0),
    subtype: String(item.subtype || ''),
    wiki: String(item.wiki || item.data?.wiki || ''),
  }))
  .filter((item) => item.title && Number.isFinite(item.start))
  .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title, 'fr'))
  .map((item) => [item.id, item.title, item.start, item.end, item.subtype, item.wiki]);

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
    count: epics.length,
  },
  epics,
};
const content = `/* Généré par scripts/import-chronas-epics.mjs — NE PAS ÉDITER.\n * Données © Chronas, CC BY-SA 4.0. */\nexport const CHRONAS_EPICS = ${JSON.stringify(snapshot)};\n`;
writeFileAtomic(OUT, content);
console.log(`${epics.length} épiques, ${(content.length / 1024).toFixed(0)} Ko`);
