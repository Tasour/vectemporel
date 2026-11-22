#!/usr/bin/env node
/* Détecte les changements de capitale sans changement de souverain dans les
 * 41 chunks Chronas. Résultat étiqueté « extrait » : aucune interprétation
 * historique n'est ajoutée. Sortie déterministe, SHA-256, zéro réseau. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, sha256Hex } from './lib/canonical.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const YEARS_DIR = path.join(ROOT, 'src/data/years');
const OUT = path.join(ROOT, 'src/data/anomalies.js');

const chunks = fs.readdirSync(YEARS_DIR)
  .filter((name) => /^c-?\d+\.json$/.test(name))
  .map((name) => ({
    start: Number(name.slice(1, -5)),
    data: JSON.parse(fs.readFileSync(path.join(YEARS_DIR, name), 'utf8')),
  }))
  .sort((a, b) => a.start - b.start);
if (chunks.length !== 41) {
  console.error(`Attendu 41 chunks, trouvé ${chunks.length}`);
  process.exit(1);
}

let rows = new Map();
const found = [];
for (const { data } of chunks) {
  rows = new Map(Object.entries(data.base));
  for (const [yearText, changes] of Object.entries(data.deltas)) {
    const year = Number(yearText);
    /* L'an 1 est un artefact de bascule BCE→CE dans Chronas. */
    if (year === 1) continue;
    for (const [name, values] of changes) {
      const before = rows.get(name);
      rows.set(name, values);
      if (!before) continue;
      const rulerBefore = String(before[0] ?? '');
      const rulerAfter = String(values[0] ?? '');
      const capitalBefore = String(before[3] ?? '');
      const capitalAfter = String(values[3] ?? '');
      if (rulerBefore !== rulerAfter || !capitalBefore || !capitalAfter || capitalBefore === capitalAfter) continue;
      found.push({ year, province: name, from: capitalBefore, to: capitalAfter, ruler: rulerAfter });
    }
  }
}

found.sort((a, b) => a.year - b.year || a.province.localeCompare(b.province, 'fr'));
const payload = {
  meta: {
    source: 'Chronas',
    license: 'CC BY-SA 4.0',
    label: 'extrait Chronas',
    rule: 'changement de capitale avec souverain identique',
    count: found.length,
  },
  items: found,
};
const sha256 = sha256Hex(canonical(payload));
payload.meta.sha256 = sha256;

const banner = `/* Généré par scripts/build-anomalies.mjs — NE PAS ÉDITER.
 * Extrait Chronas CC BY-SA 4.0 — pas une validation historique.
 * SHA-256 : ${sha256} */\n`;
fs.writeFileSync(OUT, `${banner}export const ANOMALIES = ${JSON.stringify(payload)};\n`);
console.log(`anomalies.js : ${found.length} changements de capitale sans souverain, ${sha256.slice(0, 12)}`);
