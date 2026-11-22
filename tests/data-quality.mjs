#!/usr/bin/env node
/* Rapport qualité : contrat, provenance et reproductibilité. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DATA_QUALITY } from '../src/data/data-quality.js';
import { canonical, sha256Hex } from '../scripts/lib/canonical.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'src/data/data-quality.js');
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const { sha256, ...meta } = DATA_QUALITY.meta;
check('métadonnées Chronas', DATA_QUALITY.meta.source === 'Chronas' && DATA_QUALITY.meta.license === 'CC BY-SA 4.0');
check('étiquette extrait', DATA_QUALITY.meta.label === 'extrait Chronas');
check('SHA-256 recalculé', sha256Hex(canonical({
  meta,
  coverage: DATA_QUALITY.coverage,
  missingPopulation: DATA_QUALITY.missingPopulation,
  missingCapital: DATA_QUALITY.missingCapital,
  rulersWithoutCulture: DATA_QUALITY.rulersWithoutCulture,
  indexes: DATA_QUALITY.indexes,
})) === sha256);
check('41 siècles couverts', DATA_QUALITY.coverage.length === 41);
check('couverture bornée', DATA_QUALITY.coverage.every((row) => [row.ruler, row.culture, row.religion, row.capital, row.population]
  .every((value) => value >= 0 && value <= 100) && (row.provinces > 0 || row.ruler === 0)));
check('trois années indexées', [1000, 1500, 2000].every((year) => DATA_QUALITY.indexes[year]));
check('index 1000 cohérent', DATA_QUALITY.indexes[1000].rulers[0].code === 'SNG');
check('index 2000 cohérent', DATA_QUALITY.indexes[2000].rulers[0].code === 'USA');
check('exemples datés', DATA_QUALITY.rulersWithoutCulture.every((item) => item.year >= -2000 && item.year <= 2000));
check('aucune URL distante', !JSON.stringify(DATA_QUALITY).includes('http'));

const before = fs.readFileSync(OUT);
execFileSync(process.execPath, ['scripts/build-data-quality.mjs'], { cwd: ROOT, stdio: 'pipe' });
const after = fs.readFileSync(OUT);
check('build reproductible', before.equals(after), sha256.slice(0, 12));

console.log(failed ? `${failed} échec(s)` : 'Qualité des données OK.');
process.exit(failed ? 1 : 0);
