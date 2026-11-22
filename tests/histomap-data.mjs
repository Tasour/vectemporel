#!/usr/bin/env node
/* Histomap : contrat de données, budget, SHA-256 et reproductibilité. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { canonical, sha256Hex } from '../scripts/lib/canonical.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/histomap.json'), 'utf8'));
const OUT = path.join(ROOT, 'src/data/histomap.json');
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const { sha256, ...meta } = DATA.meta;
check('métadonnées Chronas', DATA.meta.source === 'Chronas' && DATA.meta.license === 'CC BY-SA 4.0');
check('unité déclarée', /estimation Chronas/.test(DATA.meta.unit));
check('SHA-256 recalculé', sha256Hex(canonical({ meta, years: DATA.years, series: DATA.series, totals: DATA.totals })) === sha256);
check('161 échantillons', DATA.meta.count === 161 && DATA.years.length === 161, `${DATA.years.length}`);
check('pas de 25 ans de -2000 à 2000', DATA.years[0] === -2000 && DATA.years.at(-1) === 2000
  && DATA.years.every((year, index) => index === 0 || year - DATA.years[index - 1] === 25));
check('sept familles dont non classé', DATA.meta.families.length === 7 && DATA.meta.families.includes('non classé'));
check('séries complètes', DATA.meta.families.every((family) => Array.isArray(DATA.series[family])
  && DATA.series[family].length === 161));

let sumsOk = true;
let maxUnclassified = 0;
for (let index = 0; index < DATA.years.length; index += 1) {
  const sum = DATA.meta.families.reduce((total, family) => total + DATA.series[family][index], 0);
  if (sum !== DATA.totals[index]) sumsOk = false;
  maxUnclassified = Math.max(maxUnclassified, DATA.series['non classé'][index] / (DATA.totals[index] || 1));
}
check('totaux = somme des familles', sumsOk);
check('part non classé déclarée', Math.abs(meta.max_unclassified_share - Math.round(maxUnclassified * 10000) / 10000) < 1e-9,
  `${Math.round(maxUnclassified * 100)} %`);
check('aucunefamille négative', Object.values(DATA.series).every((values) => values.every((value) => Number.isFinite(value) && value >= 0)));
check('aucune URL distante', !JSON.stringify(DATA).includes('http'));
check('budget < 80 Ko', fs.statSync(OUT).size < 80 * 1024, `${fs.statSync(OUT).size} octets`);

const before = fs.readFileSync(OUT);
execFileSync(process.execPath, ['scripts/build-histomap.mjs'], { cwd: ROOT, stdio: 'pipe' });
const after = fs.readFileSync(OUT);
check('build reproductible octet pour octet', before.equals(after),
  crypto.createHash('sha256').update(after).digest('hex').slice(0, 12));

console.log(failed ? `${failed} échec(s)` : 'Histomap données OK.');
process.exit(failed ? 1 : 0);
