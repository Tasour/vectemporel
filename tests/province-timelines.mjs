#!/usr/bin/env node
/* Contrôle des chunks de timelines provinciales générés au build. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHRONAS_MAP } from '../src/data/chronas-map.js';
import { PROVINCE_CHUNKS } from '../src/data/province-timelines/index.js';
import { valueAt, transitionsAround } from '../src/data/province-timeline-store.js';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIR = path.join(ROOT, 'src/data/province-timelines');
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const names = Object.keys(PROVINCE_CHUNKS);
check('index complet', names.length === Object.keys(CHRONAS_MAP.areas).length, `${names.length}`);
check('noms cohérents', names.every((name) => Object.hasOwn(CHRONAS_MAP.areas, name)));

const files = [...new Set(Object.values(PROVINCE_CHUNKS))];
check('chunks générés', files.length > 20 && files.length < 40, `${files.length} fichiers`);
const sizes = files.map((file) => ({ file, bytes: fs.statSync(path.join(DIR, file)).size }));
const largest = sizes.sort((a, b) => b.bytes - a.bytes)[0];
check('chunk < 250 Ko', largest.bytes < 250_000, `${largest.file} ${Math.round(largest.bytes / 1024)} Ko`);

const berryFile = PROVINCE_CHUNKS.Berry;
const { PROVINCE_TIMELINES } = await import(path.join(DIR, berryFile));
const berry = PROVINCE_TIMELINES.Berry;
check('timeline Berry présente', Boolean(berry));
check('capitale Avaricum', valueAt(berry, 'capital', 100) === 'Avaricum');
check('capitale Bourges', valueAt(berry, 'capital', 1000) === 'Bourges');
check('religion païenne', valueAt(berry, 'religion', -500) === 'druidism');
check('transitions bornées', transitionsAround(berry, 'ruler', -2000, 2000, 5).length === 5);

console.log(failed ? `${failed} échec(s)` : 'Timelines provinciales OK.');
process.exit(failed ? 1 : 0);
