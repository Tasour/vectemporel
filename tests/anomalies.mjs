#!/usr/bin/env node
/* Anomalies Chronas : contrat, exclusion de l'an 1 et reproductibilité. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ANOMALIES } from '../src/data/anomalies.js';
import { PROVINCE_CHUNKS } from '../src/data/province-timelines/index.js';
import { canonical, sha256Hex } from '../scripts/lib/canonical.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'src/data/anomalies.js');
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const { sha256, ...meta } = ANOMALIES.meta;
check('métadonnées Chronas', ANOMALIES.meta.source === 'Chronas' && ANOMALIES.meta.license === 'CC BY-SA 4.0');
check('étiquette extrait', ANOMALIES.meta.label === 'extrait Chronas');
check('SHA-256 recalculé', sha256Hex(canonical({ meta, items: ANOMALIES.items })) === sha256);
check('compte cohérent', meta.count === ANOMALIES.items.length, `${meta.count}`);
check('aucune URL distante', !JSON.stringify(ANOMALIES).includes('http'));
check('année 1 exclue', ANOMALIES.items.every((item) => item.year !== 1));
check('années bornées', ANOMALIES.items.every((item) => item.year >= -2000 && item.year <= 2000));
check('provinces connues', ANOMALIES.items.every((item) => Boolean(PROVINCE_CHUNKS[item.province])));
check('capitales distinctes', ANOMALIES.items.every((item) => item.from !== item.to));
check('libellé des fichiers', fs.readFileSync(OUT, 'utf8').includes('extrait Chronas'));
check('ordre chronologique', ANOMALIES.items.every((item, index) => index === 0 || item.year >= ANOMALIES.items[index - 1].year));

const before = fs.readFileSync(OUT);
execFileSync(process.execPath, ['scripts/build-anomalies.mjs'], { cwd: ROOT, stdio: 'pipe' });
const after = fs.readFileSync(OUT);
check('build reproductible', before.equals(after), sha256.slice(0, 12));

console.log(failed ? `${failed} échec(s)` : 'Anomalies OK.');
process.exit(failed ? 1 : 0);
