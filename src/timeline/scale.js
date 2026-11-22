/* Échelle de la frise : linéaire ou « récents ».
 * Fonctions pures, sans DOM ni horloge : testables et déterministes.
 * Les bornes sont celles de la frise historique (-2000 → 2000). */

export const MIN_YEAR = -2000;
export const MAX_YEAR = 2000;
export const SPAN = MAX_YEAR - MIN_YEAR;
export const POSITION_STEPS = 1000;
export const CENTURY_STEPS = 100;

export const SCALE_MODES = Object.freeze(['linear', 'recent']);
export const SCALE_LABELS = Object.freeze({ linear: 'Linéaire', recent: 'Récents' });

/* Exposant > 1 : compresse le passé lointain, étale les siècles récents. */
const RECENT_EXPONENT = 2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeMode(mode) {
  return SCALE_MODES.includes(mode) ? mode : 'linear';
}

export function clampYear(year) {
  const value = Number(year);
  if (!Number.isFinite(value)) return MIN_YEAR;
  return Math.round(clamp(value, MIN_YEAR, MAX_YEAR));
}

/* Année → ratio 0..1 sur la largeur de la frise. */
export function yearToRatio(year, mode = 'linear') {
  const t = (clampYear(year) - MIN_YEAR) / SPAN;
  return normalizeMode(mode) === 'recent' ? t ** RECENT_EXPONENT : t;
}

/* Ratio 0..1 → année entière. */
export function ratioToYear(ratio, mode = 'linear') {
  const value = Number(ratio);
  const safe = Number.isFinite(value) ? clamp(value, 0, 1) : 0;
  const t = normalizeMode(mode) === 'recent' ? safe ** (1 / RECENT_EXPONENT) : safe;
  return clampYear(MIN_YEAR + t * SPAN);
}

/* Année → position entière 0..POSITION_STEPS (valeur d'un input range). */
export function yearToPosition(year, mode = 'linear') {
  return Math.round(yearToRatio(year, mode) * POSITION_STEPS);
}

/* Position 0..POSITION_STEPS → année entière. */
export function positionToYear(position, mode = 'linear') {
  const value = Number(position);
  const safe = Number.isFinite(value) ? clamp(value, 0, POSITION_STEPS) : 0;
  return ratioToYear(safe / POSITION_STEPS, mode);
}

/* Zoom « siècle » : 101 crans, un par année, bornés au siècle courant. */
export function centuryStart(year) {
  return Math.floor(clampYear(year) / 100) * 100;
}

export function yearToCenturyPosition(year, base) {
  return Math.round(clamp(clampYear(year) - base, 0, CENTURY_STEPS));
}

export function centuryPositionToYear(position, base) {
  const value = Number(position);
  const safe = Number.isFinite(value) ? Math.round(clamp(value, 0, CENTURY_STEPS)) : 0;
  return clampYear(base + safe);
}

/* Densité de repères par tranche, pour la minimap. */
export function densityBuckets(years, buckets = 80) {
  const size = Math.max(1, Math.round(buckets));
  const counts = new Array(size).fill(0);
  for (const year of years) {
    const ratio = yearToRatio(year, 'linear');
    const index = Math.min(size - 1, Math.max(0, Math.floor(ratio * size)));
    counts[index] += 1;
  }
  return counts;
}
