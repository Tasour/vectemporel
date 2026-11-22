#!/usr/bin/env node
/* Échelle de la frise : bornes, monotonie, aller-retour, mode récents. */
import {
  MIN_YEAR, MAX_YEAR, POSITION_STEPS, SCALE_MODES,
  clampYear, densityBuckets, positionToYear, ratioToYear, yearToPosition, yearToRatio,
} from '../src/timeline/scale.js';

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

check('bornes de la frise', MIN_YEAR === -2000 && MAX_YEAR === 2000, `${MIN_YEAR}..${MAX_YEAR}`);
check('deux échelles déclarées', SCALE_MODES.length === 2 && SCALE_MODES.includes('recent'));

const linearWidth = (yearToRatio(MAX_YEAR) - yearToRatio(MAX_YEAR - 100));

for (const mode of SCALE_MODES) {
  check(`${mode} : année minimale à 0`, yearToPosition(MIN_YEAR, mode) === 0);
  check(`${mode} : année maximale à ${POSITION_STEPS}`, yearToPosition(MAX_YEAR, mode) === POSITION_STEPS);
  check(`${mode} : ratio borné`, yearToRatio(MIN_YEAR, mode) === 0 && yearToRatio(MAX_YEAR, mode) === 1);

  let previous = -1;
  let monotone = true;
  for (let year = MIN_YEAR; year <= MAX_YEAR; year += 25) {
    const position = yearToPosition(year, mode);
    if (position < previous) monotone = false;
    previous = position;
  }
  check(`${mode} : positions croissantes`, monotone);

  /* Tolérance = plus grand pas de la grille, donc jamais de saut incohérent. */
  let maxStep = 0;
  for (let position = 0; position < POSITION_STEPS; position += 1) {
    maxStep = Math.max(maxStep, Math.abs(positionToYear(position + 1, mode) - positionToYear(position, mode)));
  }
  let worst = 0;
  for (let year = MIN_YEAR; year <= MAX_YEAR; year += 7) {
    const back = positionToYear(yearToPosition(year, mode), mode);
    worst = Math.max(worst, Math.abs(back - year));
  }
  check(`${mode} : aller-retour dans un pas`, worst <= maxStep, `écart max ${worst}, pas max ${maxStep}`);

  check(`${mode} : déterminisme`, yearToPosition(1234, mode) === yearToPosition(1234, mode));
}

check('récents : le dernier siècle gagne de la largeur',
  yearToRatio(MAX_YEAR, 'recent') - yearToRatio(MAX_YEAR - 100, 'recent') > linearWidth);
check('récents : le premier siècle perd de la largeur',
  yearToRatio(MIN_YEAR + 100, 'recent') - yearToRatio(MIN_YEAR, 'recent') < linearWidth);
check('ratio hors bornes ramené', ratioToYear(-3) === MIN_YEAR && ratioToYear(9) === MAX_YEAR);
check('année hors bornes ramenée', clampYear(-9999) === MIN_YEAR && clampYear(9999) === MAX_YEAR);
check('année non numérique ramenée', clampYear('Berry') === MIN_YEAR);
check('position hors bornes ramenée', positionToYear(-50) === MIN_YEAR && positionToYear(5000) === MAX_YEAR);

const counts = densityBuckets([MIN_YEAR, MAX_YEAR, 1000, 1000], 4);
check('densité : bon nombre de tranches', counts.length === 4);
check('densité : total conservé', counts.reduce((sum, value) => sum + value, 0) === 4);
check('densité : bornes peuplées', counts[0] >= 1 && counts[3] >= 1, counts.join(','));

console.log(failed ? `${failed} échec(s)` : 'Échelle de la frise OK.');
process.exit(failed ? 1 : 0);
