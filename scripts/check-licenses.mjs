#!/usr/bin/env node
/* Contrôle des mentions de licence dans les livrables locaux. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
let failed = 0;
const check = (name, ok) => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
};

const attribution = read('ATTRIBUTION.md');
const dataLicense = read('DATA-LICENSE.md');
const licenses = read('LICENSES.md');
const d3 = read('vendor/D3-LICENSES.md');
const three = read('public/three-bundle.js').slice(0, 1200);
const d3Bundle = read('public/d3-bundle.js').slice(0, 1200);

check('Chronas cité dans ATTRIBUTION', /Chronas/i.test(attribution));
check('CC BY-SA 4.0 dans DATA-LICENSE', /CC BY-SA 4\.0/.test(dataLicense));
check('MIT dans LICENSES', /MIT/.test(licenses));
check('ISC dans LICENSES', /ISC/.test(licenses));
check('D3 ISC dans le vendor', /ISC|Mike Bostock/i.test(d3));
check('en-tête licence Three', /MIT|three\.js/i.test(three));
check('en-tête licence D3', /ISC|d3js\.org/i.test(d3Bundle));
check('pas de licence inconnue', !/licence inconnue/i.test(licenses));

console.log(failed ? `${failed} échec(s)` : 'Licences OK.');
process.exit(failed ? 1 : 0);
