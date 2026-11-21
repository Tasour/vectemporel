#!/usr/bin/env node
/* Import build-time des noms de pays modernes depuis Natural Earth (domaine public).
 * Sortie compacte : [nomFR, nomEN, lon, lat, rang]. Zéro réseau au runtime. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './lib/atomic.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'src/data/modern-labels.js');
const SOURCE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

const response = await fetch(SOURCE, { signal: AbortSignal.timeout(30000), redirect: 'error' });
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const buffer = await response.arrayBuffer();
if (buffer.byteLength > 2_000_000) throw new Error('Réponse trop volumineuse');
const raw = JSON.parse(new TextDecoder().decode(buffer));

const countries = (raw.features || [])
  .map((feature) => {
    const p = feature.properties || {};
    const lon = Number(p.LABEL_X);
    const lat = Number(p.LABEL_Y);
    const fr = String(p.NAME_FR || p.NAME || '').trim();
    const en = String(p.NAME_EN || p.NAME || '').trim();
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || !fr) return null;
    return [fr, en, Math.round(lon * 1000) / 1000, Math.round(lat * 1000) / 1000, Number(p.LABELRANK) || 9];
  })
  .filter(Boolean)
  .sort((a, b) => a[4] - b[4] || a[0].localeCompare(b[0], 'fr'));

const snapshot = {
  meta: {
    source: 'Natural Earth',
    dataset: 'ne_110m_admin_0_countries',
    license: 'Public domain',
    dataset_url: 'naturalearthdata.com',
    retrieved_at: new Date().toISOString().slice(0, 10),
    count: countries.length,
  },
  countries,
};
const content = `/* Généré par scripts/import-modern-labels.mjs — Natural Earth, domaine public.\n * NE PAS ÉDITER. */\nexport const MODERN_LABELS = ${JSON.stringify(snapshot)};\n`;
writeFileAtomic(OUT, content);
console.log(`${countries.length} pays, ${(content.length / 1024).toFixed(0)} Ko`);
