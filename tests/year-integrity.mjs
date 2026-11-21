#!/usr/bin/env node
/* Intégrité des chunks d'années : l'année 1000 reconstruite doit être
 * identique au snapshot de référence, et les bornes doivent être présentes. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHRONAS_MAP } from '../src/data/chronas-map.js';
import { reconstruct, centuryStart, clampYear } from '../src/data/year-store.js';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIR = path.join(ROOT, 'src/data/years');
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const meta = CHRONAS_MAP.meta;
check('bornes -2000..2000', meta.minYear === -2000 && meta.maxYear === 2000);
check('base -2000 présente', Boolean(CHRONAS_MAP.base));

const load = (year) => JSON.parse(fs.readFileSync(path.join(DIR, `c${centuryStart(year)}.json`), 'utf8'));

const normalized = (areas) => JSON.stringify(Object.entries(areas).sort((a, b) => a[0].localeCompare(b[0])));

const at1000 = reconstruct(load(1000), 1000);
check('année 1000 identique au snapshot', normalized(at1000) === normalized(CHRONAS_MAP.areas),
  `${Object.keys(at1000).length} régions reconstruites`);

const at2000 = reconstruct(load(2000), 2000);
check('année 2000 reconstruite', Object.keys(at2000).length > 2000, `${Object.keys(at2000).length} régions`);

const atMinus = reconstruct(load(-2000), -2000);
check('année -2000 reconstruite', Object.keys(atMinus).length > 2000, `${Object.keys(atMinus).length} régions`);

check('clampYear', clampYear(-3000) === -2000 && clampYear(3000) === 2000 && clampYear('1500') === 1500);
check('centuryStart', centuryStart(-1999) === -2000 && centuryStart(1000) === 1000 && centuryStart(2000) === 2000);

const fileCount = fs.readdirSync(DIR).filter((name) => /^c-?\d+\.json$/.test(name)).length;
check('41 chunks de siècle', fileCount === 41, `${fileCount} fichiers`);

console.log(failed ? `${failed} échec(s)` : 'Intégrité des années OK.');
process.exit(failed ? 1 : 0);
