#!/usr/bin/env node
/* Points de rupture : contrat de données, règle ADR-0012 et reproductibilité. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TURNING_POINTS } from '../src/data/turning-points.js';
import { PROVINCE_CHUNKS } from '../src/data/province-timelines/index.js';
import { canonical, sha256Hex } from '../scripts/lib/canonical.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'src/data/turning-points.js');
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const { sha256, ...meta } = TURNING_POINTS.meta;
check('métadonnées Chronas', TURNING_POINTS.meta.source === 'Chronas' && TURNING_POINTS.meta.license === 'CC BY-SA 4.0');
check('SHA-256 recalculé', sha256Hex(canonical({ meta, points: TURNING_POINTS.points })) === sha256);
check('compte cohérent', meta.count === TURNING_POINTS.points.length, `${meta.count}`);
check('au plus 60 ruptures', TURNING_POINTS.points.length <= 60);
check('aucune URL distante', !JSON.stringify(TURNING_POINTS).includes('http'));

let spacingOk = true;
let centuryOk = true;
const perCentury = new Map();
let previous = -Infinity;
for (const [index, point] of TURNING_POINTS.points.entries()) {
  const label = `rupture[${index + 1}]`;
  check(`${label} : année entière bornée`, Number.isInteger(point.year) && point.year >= -2000 && point.year <= 2000, `${point.year}`);
  check(`${label} : au moins 20 souverains changés`, point.rulers >= 20, `${point.rulers}`);
  check(`${label} : artefact de l’an 1 exclu`, point.year !== 1);
  check(`${label} : artefact de population exclu`, point.population_delta <= 10_000_000, `${point.population_delta}`);
  check(`${label} : libellé généré`, point.label === `Bascule des souverains : ${point.rulers} régions`);
  check(`${label} : provinces prouvées`, point.provinces.length >= 1 && point.provinces.length <= 5
    && point.provinces.every((name) => Boolean(PROVINCE_CHUNKS[name])));
  if (point.year - previous < 25) spacingOk = false;
  previous = point.year;
  const century = Math.floor(point.year / 100);
  perCentury.set(century, (perCentury.get(century) || 0) + 1);
}
check('espacement ≥ 25 ans', spacingOk);
for (const [century, count] of perCentury) check(`siècle ${century} : ≤ 2 ruptures`, count <= 2, `${count}`);
check('années croissantes', TURNING_POINTS.points.every((point, index) => index === 0 || point.year > TURNING_POINTS.points[index - 1].year));

/* Le build écrit le même fichier octet pour octet, deux fois de suite. */
const before = fs.readFileSync(OUT);
execFileSync(process.execPath, ['scripts/build-turning-points.mjs'], { cwd: ROOT, stdio: 'pipe' });
const middle = fs.readFileSync(OUT);
execFileSync(process.execPath, ['scripts/build-turning-points.mjs'], { cwd: ROOT, stdio: 'pipe' });
const after = fs.readFileSync(OUT);
check('build reproductible octet pour octet',
  before.equals(middle) && middle.equals(after),
  crypto.createHash('sha256').update(after).digest('hex').slice(0, 12));

console.log(failed ? `${failed} échec(s)` : 'Points de rupture OK.');
process.exit(failed ? 1 : 0);
