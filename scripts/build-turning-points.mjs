#!/usr/bin/env node
/* Détecte les ruptures dans les 41 chunks annuels Chronas.
 *
 * Règle (ADR-0012) : changement de souverain dans ≥ 20 provinces ;
 * score = changements + min(|Δ population| / 5 000, 40) ;
 * exclusion de l'an 1 (bascule BCE→CE) et des deltas de population
 * > 10 000 000 (changement d'échelle de la source) ;
 * 60 points max, espacement ≥ 25 ans, 2 par siècle.
 *
 * Sortie déterministe : JSON canonique + SHA-256. Aucun réseau. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, sha256Hex } from './lib/canonical.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const YEARS_DIR = path.join(ROOT, 'src/data/years');
const OUT = path.join(ROOT, 'src/data/turning-points.js');
const MIN_RULERS = 20;
const MAX_POINTS = 60;
const MIN_SPACING = 25;
const MAX_PER_CENTURY = 2;
const EXCLUDED_YEARS = [1];
const MAX_POP_DELTA = 10_000_000;

const chunks = fs.readdirSync(YEARS_DIR)
  .filter((name) => /^c-?\d+\.json$/.test(name))
  .map((name) => ({
    start: Number(name.slice(1, -5)),
    data: JSON.parse(fs.readFileSync(path.join(YEARS_DIR, name), 'utf8')),
  }))
  .sort((a, b) => a.start - b.start);

if (chunks.length !== 41) {
  console.error(`Attendu 41 chunks, trouvé ${chunks.length}`);
  process.exit(1);
}

/* État courant : province -> [souverain, culture, religion, capitale, population]. */
const state = new Map();
const candidates = [];
for (const { data } of chunks) {
  for (const [name, values] of Object.entries(data.base)) state.set(name, values);
  for (const [yearText, changes] of Object.entries(data.deltas)) {
    const year = Number(yearText);
    if (EXCLUDED_YEARS.includes(year)) continue;
    let rulers = 0;
    let populationDelta = 0;
    const touched = new Map();
    for (const [name, values] of changes) {
      const before = state.get(name);
      state.set(name, values);
      if (!before) continue;
      let weight = 0;
      if (String(before[0]) !== String(values[0])) {
        rulers += 1;
        weight += 1;
      }
      const change = Math.abs(Number(values[4]) - Number(before[4]));
      if (Number.isFinite(change)) populationDelta += change;
      if (change > 0) weight += Math.min(change / 5000, 40);
      if (weight > 0) touched.set(name, Math.round(weight * 100) / 100);
    }
    if (populationDelta > MAX_POP_DELTA || rulers < MIN_RULERS) continue;
    const boundedPop = Math.min(populationDelta / 5000, 40);
    const provinces = [...touched.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
      .slice(0, 5)
      .map(([name]) => name);
    const kind = 'souverains';
    candidates.push({
      year,
      kind,
      rulers,
      provinces,
      population_delta: populationDelta,
      score: Math.round((rulers + boundedPop) * 100) / 100,
    });
  }
}

candidates.sort((a, b) => b.score - a.score || a.year - b.year);
const selected = [];
const perCentury = new Map();
for (const point of candidates) {
  if (selected.length >= MAX_POINTS) break;
  if (selected.some((kept) => Math.abs(kept.year - point.year) < MIN_SPACING)) continue;
  const century = Math.floor(point.year / 100);
  if ((perCentury.get(century) || 0) >= MAX_PER_CENTURY) continue;
  perCentury.set(century, (perCentury.get(century) || 0) + 1);
  selected.push(point);
}
selected.sort((a, b) => a.year - b.year);
for (const point of selected) {
  point.label = `Bascule des souverains : ${point.rulers} régions`;
}

const payload = {
  meta: {
    source: 'Chronas',
    license: 'CC BY-SA 4.0',
    rule: 'ruler changes >= 20 ; score = changes + min(pop_delta/5000, 40) as tie-breaker',
    excluded_years: EXCLUDED_YEARS,
    excluded_pop_delta_above: MAX_POP_DELTA,
    spacing: MIN_SPACING,
    max_per_century: MAX_PER_CENTURY,
    count: selected.length,
  },
  points: selected,
};
const sha256 = sha256Hex(canonical(payload));
payload.meta.sha256 = sha256;
const banner = `/* Généré par scripts/build-turning-points.mjs — NE PAS ÉDITER.
 * Règle et artefacts exclus : docs/architecture/DECISIONS/ADR-0012-points-de-rupture.md.
 * Données © Chronas, CC BY-SA 4.0. SHA-256 : ${sha256} */\n`;
fs.writeFileSync(OUT, `${banner}export const TURNING_POINTS = ${JSON.stringify(payload)};\n`);
console.log(`turning-points.js : ${selected.length} ruptures, ${sha256.slice(0, 12)}`);
