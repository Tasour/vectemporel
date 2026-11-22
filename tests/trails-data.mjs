#!/usr/bin/env node
/* Récits guidés : contrat de données et preuve de chaque jalon.
 * Recalcule la valeur Chronas à l'année du jalon : aucun récit ne peut
 * raconter autre chose que la donnée locale. */
import { TRAILS } from '../src/data/trails.js';
import { PROVINCE_CHUNKS } from '../src/data/province-timelines/index.js';
import { canonical, sha256Hex } from '../scripts/lib/canonical.mjs';

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const FIELDS = new Set(['ruler', 'culture', 'religion', 'capital', 'population']);
const MIN_YEAR = -2000;
const MAX_YEAR = 2000;

function valueAt(series, year) {
  let value = null;
  for (const [start, entry] of series || []) {
    if (start <= year) value = entry;
    else break;
  }
  return value;
}

const chunks = new Map();
async function timelineOf(province) {
  const file = PROVINCE_CHUNKS[province];
  if (!file) return null;
  if (!chunks.has(file)) {
    const module = await import(`../src/data/province-timelines/${file}`);
    for (const [name, series] of Object.entries(module.PROVINCE_TIMELINES)) chunks.set(name, series);
  }
  return chunks.get(province) || null;
}

check('dix récits', TRAILS.trails.length === 10, `${TRAILS.trails.length}`);
check('métadonnées éditoriales', TRAILS.trails.every((trail) => [
  'débutant', 'intermédiaire', 'expert',
].includes(trail.difficulty) && Number.isInteger(trail.duration) && trail.duration > 0
  && Array.isArray(trail.tags) && trail.tags.length > 0));
check('métadonnées Chronas', TRAILS.meta.source === 'Chronas' && TRAILS.meta.license === 'CC BY-SA 4.0');
check('SHA-256 sur 64 caractères', /^[0-9a-f]{64}$/.test(TRAILS.meta.sha256));
check('SHA-256 recalculé identique', sha256Hex(canonical({ trails: TRAILS.trails })) === TRAILS.meta.sha256);
check('aucune URL distante', !JSON.stringify(TRAILS).includes('http'));

const ids = TRAILS.trails.map((trail) => trail.id);
check('identifiants uniques', new Set(ids).size === ids.length, ids.join(','));
check('total de jalons cohérent',
  TRAILS.meta.steps === TRAILS.trails.reduce((sum, trail) => sum + trail.steps.length, 0),
  `${TRAILS.meta.steps}`);

for (const trail of TRAILS.trails) {
  check(`« ${trail.id} » : titre et sous-titre`, trail.title.length > 4 && trail.subtitle.length > 19);
  check(`« ${trail.id} » : 5 à 8 jalons`, trail.steps.length >= 5 && trail.steps.length <= 8, `${trail.steps.length}`);

  let previous = MIN_YEAR - 1;
  let ordered = true;
  let evidenced = 0;
  for (const [index, step] of trail.steps.entries()) {
    const label = `${trail.id}[${index + 1}]`;
    if (step.year < previous) ordered = false;
    previous = step.year;
    check(`${label} : année dans les bornes`, Number.isInteger(step.year) && step.year >= MIN_YEAR && step.year <= MAX_YEAR, `${step.year}`);
    check(`${label} : texte 80–420 caractères`, step.text.length >= 80 && step.text.length <= 420, `${step.text.length}`);
    const timeline = await timelineOf(step.province);
    check(`${label} : province « ${step.province} » connue`, Boolean(timeline));
    if (!timeline) continue;
    check(`${label} : champ de preuve déclaré`, FIELDS.has(step.evidence?.field), step.evidence?.field);
    const actual = valueAt(timeline[step.evidence?.field], step.year);
    check(`${label} : preuve ${step.evidence?.field}=${step.evidence?.value}`, String(actual) === String(step.evidence?.value), `donnée « ${actual} »`);
    if (String(actual) === String(step.evidence?.value)) evidenced += 1;
  }
  check(`« ${trail.id} » : années croissantes`, ordered);
  check(`« ${trail.id} » : tous les jalons prouvés`, evidenced === trail.steps.length, `${evidenced}/${trail.steps.length}`);
}

console.log(failed ? `${failed} échec(s)` : 'Récits guidés OK.');
process.exit(failed ? 1 : 0);
