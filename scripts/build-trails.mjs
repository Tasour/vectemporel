#!/usr/bin/env node
/* Génère src/data/trails.js à partir de content/trails/*.json.
 *
 * Chaque jalon porte une preuve : le champ Chronas (`ruler`, `culture`,
 * `religion`, `capital` ou `population`) doit valoir exactement la valeur
 * déclarée à l'année du jalon. Une divergence casse le build : aucun récit
 * ne peut raconter autre chose que la donnée source.
 *
 * Sortie déterministe : JSON canonique trié + SHA-256 affiché et embarqué.
 * Aucun réseau. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROVINCE_CHUNKS } from '../src/data/province-timelines/index.js';
import { canonical, sha256Hex } from './lib/canonical.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC_DIR = path.join(ROOT, 'content/trails');
const OUT = path.join(ROOT, 'src/data/trails.js');
const MIN_YEAR = -2000;
const MAX_YEAR = 2000;
const FIELDS = new Set(['ruler', 'culture', 'religion', 'capital', 'population']);
const MIN_STEPS = 5;
const MAX_STEPS = 8;
const MIN_TEXT = 80;
const MAX_TEXT = 420;

const errors = [];
const fail = (file, message) => errors.push(`${file}: ${message}`);

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

const files = fs.readdirSync(SRC_DIR).filter((name) => name.endsWith('.json')).sort();
if (!files.length) fail('content/trails', 'aucun récit');

const trails = [];
for (const file of files) {
  let trail;
  try {
    trail = JSON.parse(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'));
  } catch (error) {
    fail(file, `JSON invalide (${error.message})`);
    continue;
  }
  const expectedId = path.basename(file, '.json');
  if (trail.id !== expectedId) fail(file, `id « ${trail.id} » différent du fichier « ${expectedId} »`);
  if (typeof trail.title !== 'string' || trail.title.length < 5) fail(file, 'titre manquant');
  if (typeof trail.subtitle !== 'string' || trail.subtitle.length < 20) fail(file, 'sous-titre trop court');
  if (!['débutant', 'intermédiaire', 'expert'].includes(trail.difficulty)) fail(file, `difficulté invalide (${trail.difficulty})`);
  if (!Number.isInteger(trail.duration) || trail.duration < 1 || trail.duration > 120) fail(file, `durée invalide (${trail.duration})`);
  if (!Array.isArray(trail.tags) || trail.tags.length < 1 || !trail.tags.every((tag) => typeof tag === 'string' && tag.trim().length > 1)) {
    fail(file, 'tags invalides');
  }
  if (!Array.isArray(trail.steps)) { fail(file, 'steps absent'); continue; }
  if (trail.steps.length < MIN_STEPS || trail.steps.length > MAX_STEPS) {
    fail(file, `${trail.steps.length} jalons (attendu ${MIN_STEPS}–${MAX_STEPS})`);
  }

  let previousYear = MIN_YEAR - 1;
  for (const [index, step] of trail.steps.entries()) {
    const where = `jalon ${index + 1}`;
    if (!Number.isInteger(step.year) || step.year < MIN_YEAR || step.year > MAX_YEAR) {
      fail(file, `${where}: année invalide (${step.year})`);
      continue;
    }
    if (step.year < previousYear) fail(file, `${where}: années non croissantes (${step.year})`);
    previousYear = step.year;
    if (typeof step.title !== 'string' || step.title.length < 5) fail(file, `${where}: titre manquant`);
    if (typeof step.text !== 'string' || step.text.length < MIN_TEXT || step.text.length > MAX_TEXT) {
      fail(file, `${where}: texte de ${step.text?.length ?? 0} caractères (attendu ${MIN_TEXT}–${MAX_TEXT})`);
    }
    if (typeof step.province !== 'string') { fail(file, `${where}: province absente`); continue; }
    const timeline = await timelineOf(step.province);
    if (!timeline) { fail(file, `${where}: province « ${step.province} » inconnue`); continue; }
    const evidence = step.evidence;
    if (!evidence || !FIELDS.has(evidence.field)) {
      fail(file, `${where}: champ de preuve invalide`);
      continue;
    }
    const actual = valueAt(timeline[evidence.field], step.year);
    if (actual === null || actual === undefined) {
      fail(file, `${where}: ${evidence.field} absent en ${step.year}`);
    } else if (String(actual) !== String(evidence.value)) {
      fail(file, `${where}: ${evidence.field} en ${step.year} vaut « ${actual} », preuve « ${evidence.value} »`);
    }
  }
  trails.push(trail);
}

if (errors.length) {
  console.error(`Récits invalides (${errors.length}) :`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

trails.sort((a, b) => a.id.localeCompare(b.id));
const payload = canonical({ trails });
const sha256 = sha256Hex(payload);
const stepCount = trails.reduce((sum, trail) => sum + trail.steps.length, 0);

const banner = `/* Généré par scripts/build-trails.mjs — NE PAS ÉDITER.
 * Récits guidés : chaque jalon est prouvé par un champ Chronas à son année.
 * Données © Chronas, CC BY-SA 4.0. Texte des récits : © Vincent Tassier, MIT.
 * SHA-256 du contenu canonique : ${sha256}
 * ${trails.length} récits, ${stepCount} jalons. */`;

const body = `export const TRAILS = ${JSON.stringify({ meta: { source: 'Chronas', license: 'CC BY-SA 4.0', sha256, count: trails.length, steps: stepCount }, trails }, null, 0)};\n`;

fs.writeFileSync(OUT, `${banner}\n${body}`);
console.log(`src/data/trails.js : ${trails.length} récits, ${stepCount} jalons, ${sha256.slice(0, 12)}`);
