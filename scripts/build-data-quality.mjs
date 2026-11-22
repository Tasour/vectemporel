#!/usr/bin/env node
/* Rapport de qualité et index calculés depuis les 41 chunks Chronas.
 * Tous les champs sont des extraits recalculables, jamais des validations. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, sha256Hex } from './lib/canonical.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const YEARS_DIR = path.join(ROOT, 'src/data/years');
const OUT = path.join(ROOT, 'src/data/data-quality.js');
const REFERENCE_YEARS = [1000, 1500, 2000];

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

const coverage = [];
const missingPopulation = [];
const missingCapital = [];
const rulersWithoutCulture = [];
const indexes = {};
let rows = new Map();

function snapshotAt(year) {
  const values = Object.entries(rows).map(([name, row]) => ({
    name,
    ruler: String(row?.[0] ?? ''),
    culture: String(row?.[1] ?? ''),
    religion: String(row?.[2] ?? ''),
    capital: String(row?.[3] ?? ''),
    population: Number(row?.[4]) || 0,
  }));
  const total = values.length || 1;
  const filled = (key) => values.filter((item) => item[key]).length;
  return {
    year,
    provinces: values.length,
    ruler: Math.round(1000 * filled('ruler') / total) / 10,
    culture: Math.round(1000 * filled('culture') / total) / 10,
    religion: Math.round(1000 * filled('religion') / total) / 10,
    capital: Math.round(1000 * filled('capital') / total) / 10,
    population: Math.round(1000 * values.filter((item) => item.population > 0).length / total) / 10,
  };
}

function topIndexes(year) {
  const rulers = new Map();
  const cultures = new Map();
  for (const row of rows.values()) {
    const ruler = String(row?.[0] ?? '');
    const culture = String(row?.[1] ?? '');
    if (ruler) rulers.set(ruler, (rulers.get(ruler) || 0) + 1);
    if (culture) cultures.set(culture, (cultures.get(culture) || 0) + (Number(row?.[4]) || 0));
  }
  return {
    year,
    rulers: [...rulers].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr')).slice(0, 12)
      .map(([code, count]) => ({ code, count })),
    cultures: [...cultures].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr')).slice(0, 12)
      .map(([code, population]) => ({ code, population })),
  };
}

for (const { start, data } of chunks) {
  rows = new Map(Object.entries(data.base));
  coverage.push(snapshotAt(start));
  if (REFERENCE_YEARS.includes(start)) indexes[start] = topIndexes(start);
  for (const [yearText, changes] of Object.entries(data.deltas)) {
    const year = Number(yearText);
    for (const [name, values] of changes) {
      const before = rows.get(name);
      rows.set(name, values);
      if (!before) continue;
      if ((!Number.isFinite(Number(values[4])) || Number(values[4]) <= 0) && missingPopulation.length < 40) {
        missingPopulation.push({ year, province: name });
      }
      if (!String(values[3] ?? '') && missingCapital.length < 40) {
        missingCapital.push({ year, province: name });
      }
      if (String(before[0]) !== String(values[0]) && String(before[1]) === String(values[1])
        && rulersWithoutCulture.length < 40) {
        rulersWithoutCulture.push({ year, province: name, ruler: String(values[0] ?? '') });
      }
    }
    if (REFERENCE_YEARS.includes(year)) indexes[year] = topIndexes(year);
  }
}
for (const year of REFERENCE_YEARS) if (!indexes[year]) indexes[year] = topIndexes(year);

const payload = {
  meta: {
    source: 'Chronas',
    license: 'CC BY-SA 4.0',
    label: 'extrait Chronas',
    rule: 'couverture des champs par siècle et changements de souverain sans culture',
    reference_years: REFERENCE_YEARS,
  },
  coverage,
  missingPopulation,
  missingCapital,
  rulersWithoutCulture,
  indexes,
};
const sha256 = sha256Hex(canonical(payload));
payload.meta.sha256 = sha256;
const banner = `/* Généré par scripts/build-data-quality.mjs — NE PAS ÉDITER.
 * Extrait Chronas CC BY-SA 4.0. SHA-256 : ${sha256} */\n`;
fs.writeFileSync(OUT, `${banner}export const DATA_QUALITY = ${JSON.stringify(payload)};\n`);
console.log(`data-quality.js : ${coverage.length} siècles, ${rulersWithoutCulture.length} exemples, ${sha256.slice(0, 12)}`);
