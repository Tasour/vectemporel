#!/usr/bin/env node
/* Contrôle déterministe du maillage vectoriel des provinces (ADR-0007). */
import { THREE } from '../src/globe/three.js';
import { AREAS } from '../src/map/data.js';
import { buildProvinceData, ZOOM_MAX } from '../src/globe/vector-provinces.js';

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const started = Date.now();
const data = buildProvinceData(AREAS, 1, THREE);
const elapsed = Date.now() - started;
check('maillage non vide', data.triangles > 10000, `${data.triangles} triangles`);
check('sommets finis', data.positions.every((value) => Number.isFinite(value)));
check('couleurs finies', data.colors.every((value) => Number.isFinite(value)));
check('index valides', data.indices.every((index) => Number.isInteger(index) && index >= 0 && index < data.positions.length / 3));
check('rayon constant 1.003', data.positions.every((_, index) => {
  if (index % 3 !== 0) return true;
  const radius = Math.hypot(data.positions[index], data.positions[index + 1], data.positions[index + 2]);
  return Math.abs(radius - 1.003) < 1e-6;
}));
check('contours générés', data.edges.length > 0 && data.edges.length % 6 === 0, `${data.edges.length / 6} segments`);
check('polygones ignorés bornés', data.skipped <= 5, `${data.skipped}`);
check('construction < 2 s (démarrage à froid)', elapsed < 2000, `${elapsed} ms`);
check('zoom maximal 7.2', ZOOM_MAX === 7.2);

const second = buildProvinceData(AREAS, 1, THREE);
check('déterminisme', JSON.stringify(second.indices) === JSON.stringify(data.indices));

console.log(failed ? `${failed} échec(s)` : 'Maillage vectoriel OK.');
process.exit(failed ? 1 : 0);
