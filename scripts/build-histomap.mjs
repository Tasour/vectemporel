#!/usr/bin/env node
/* Construit src/data/histomap.json : population estimée par famille culturelle,
 * tous les 25 ans de -2000 à 2000, depuis les 41 chunks Chronas locaux.
 *
 * La table scripts/families.csv est éditoriale et auditable : toute culture
 * absente est comptée dans « non classé », jamais répartie arbitrairement.
 * Sortie déterministe, SHA-256 canonique, aucun réseau. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, sha256Hex } from './lib/canonical.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const YEARS_DIR = path.join(ROOT, 'src/data/years');
const CSV = path.join(ROOT, 'scripts/families.csv');
const OUT = path.join(ROOT, 'src/data/histomap.json');
const MIN_YEAR = -2000;
const MAX_YEAR = 2000;
const STEP = 25;
const UNCLASSIFIED = 'non classé';

const csvLines = fs.readFileSync(CSV, 'utf8').trim().split('\n');
if (csvLines[0] !== 'culture,famille,population_cumulee_M') {
  console.error('En-tête CSV inattendu');
  process.exit(1);
}
const families = new Map();
for (const line of csvLines.slice(1)) {
  const [culture, family] = line.split(',');
  if (!culture || !family) { console.error(`Ligne CSV invalide : ${line}`); process.exit(1); }
  families.set(culture, family);
}
const FAMILY_ORDER = [
  'Chinois', 'Indien', 'Islamique', 'Européen', 'Amériques',
  'Asie orientale et du Sud-Est', UNCLASSIFIED,
];

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

const years = [];
const series = Object.fromEntries(FAMILY_ORDER.map((family) => [family, []]));
const totals = [];
let rows = new Map();

function sample(year) {
  const counts = Object.fromEntries(FAMILY_ORDER.map((family) => [family, 0]));
  for (const row of rows.values()) {
    const family = families.get(String(row[1] ?? '')) || UNCLASSIFIED;
    const population = Number(row[4]);
    if (Number.isFinite(population) && population > 0) counts[family] += population;
  }
  years.push(year);
  for (const family of FAMILY_ORDER) series[family].push(counts[family]);
  totals.push(FAMILY_ORDER.reduce((sum, family) => sum + counts[family], 0));
}

for (const { start, data } of chunks) {
  rows = new Map(Object.entries(data.base));
  if (start >= MIN_YEAR && start <= MAX_YEAR) sample(start);
  for (const [yearText, changes] of Object.entries(data.deltas)) {
    const year = Number(yearText);
    for (const [name, values] of changes) rows.set(name, values);
    if (year >= MIN_YEAR && year <= MAX_YEAR && year % STEP === 0) sample(year);
  }
}

let maxUnclassified = 0;
for (let index = 0; index < years.length; index += 1) {
  const total = totals[index] || 1;
  maxUnclassified = Math.max(maxUnclassified, series[UNCLASSIFIED][index] / total);
}

const payload = {
  meta: {
    source: 'Chronas',
    license: 'CC BY-SA 4.0',
    unit: 'habitants (estimation Chronas)',
    step: STEP,
    count: years.length,
    families: FAMILY_ORDER,
    max_unclassified_share: Math.round(maxUnclassified * 10000) / 10000,
  },
  years,
  series,
  totals,
};
const sha256 = sha256Hex(canonical(payload));
payload.meta.sha256 = sha256;

fs.writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
const bytes = fs.statSync(OUT).size;
if (bytes > 80 * 1024) {
  console.error(`Dépassement budget : ${bytes} octets > 80 Ko`);
  process.exit(1);
}
console.log(`histomap.json : ${years.length} échantillons, ${FAMILY_ORDER.length} familles, ${bytes} octets, ${sha256.slice(0, 12)}`);
