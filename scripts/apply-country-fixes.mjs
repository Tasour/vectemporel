#!/usr/bin/env node
/*
 * Vectemporel — applique les patches d’intégration des dossiers pays.
 *
 * Lit audits/<pays>/fixes.yaml, met à jour data.js :
 * - corrections d’événements existants ;
 * - renommages d’ères ;
 * - ajouts d’événements prioritaires.
 *
 * Usage :
 *   node scripts/apply-country-fixes.mjs --dry-run
 *   node scripts/apply-country-fixes.mjs
 *
 * Le script ne publie rien : il écrit data.js, puis les audits doivent être relancés.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import YAML from 'yaml';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const COUNTRIES = ['france', 'uk', 'usa', 'germany', 'italy', 'spain', 'china', 'india', 'japan', 'egypt'];
const TAGS = new Set(['politique', 'guerre', 'sciences', 'arts', 'religion', 'societe', 'economie', 'exploration']);
const ALLOWED_SET = new Set(['title', 'subtitle', 'summary', 'year', 'endYear', 'tags', 'importance']);
const DRY_RUN = process.argv.includes('--dry-run');

function loadData() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'), context);
  return context.window.VECTEMPOREL_DATA;
}

function readJsonlCsv(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(1)
    .map((line) => line.split(',')[0].trim().replace(/^"|"$/g, ''));
}

function readFixes(country) {
  const file = path.join(ROOT, 'audits', country, 'fixes.yaml');
  if (!fs.existsSync(file)) return null;
  return YAML.parse(fs.readFileSync(file, 'utf8'));
}

function readProposals(country) {
  const file = path.join(ROOT, 'audits', country, 'proposals.yaml');
  if (!fs.existsSync(file)) return null;
  return YAML.parse(fs.readFileSync(file, 'utf8'));
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

const data = loadData();
const errors = [];
const warnings = [];
const stats = {
  countries: 0,
  eventUpdates: 0,
  eventAdditions: 0,
  eraUpdates: 0,
  unresolved: 0,
  byCountry: {},
};

const allEventIds = new Set();
for (const country of data.countries) {
  for (const event of country.events) allEventIds.add(event.id);
}

const fixesByCountry = new Map();
for (const countryId of COUNTRIES) {
  const fixes = readFixes(countryId);
  if (!fixes) {
    warnings.push(`${countryId}: aucun fixes.yaml`);
    continue;
  }
  fixesByCountry.set(countryId, fixes);
}

// Première passe : valider les identifiants et construire l’ensemble des nouveaux IDs.
const newIds = new Set();
for (const [countryId, fixes] of fixesByCountry) {
  for (const addition of fixes.event_additions || []) {
    assert(Boolean(addition.id), `${countryId}: ajout sans id`, errors);
    assert(!allEventIds.has(addition.id), `${countryId}: identifiant déjà existant ${addition.id}`, errors);
    assert(!newIds.has(addition.id), `${countryId}: identifiant dupliqué ${addition.id}`, errors);
    newIds.add(addition.id);
  }
}

for (const [countryId, fixes] of fixesByCountry) {
  const country = data.countries.find((item) => item.id === countryId);
  if (!country) {
    errors.push(`${countryId}: pays absent de data.js`);
    continue;
  }
  const sourceIds = new Set(readJsonlCsv(path.join(ROOT, 'audits', countryId, 'source-register.csv')));
  const proposals = readProposals(countryId);
  const correctionSources = new Map(
    (proposals?.corrections || []).map((correction) => [correction.existing_id, correction.sources || []])
  );
  const eventById = new Map(country.events.map((event) => [event.id, event]));
  const eraByName = new Map(country.eras.map((era) => [era.name, era]));
  const countryStats = { updates: 0, additions: 0, eras: 0, unresolved: 0 };

  for (const update of fixes.event_updates || []) {
    const event = eventById.get(update.id);
    assert(Boolean(event), `${countryId}: événement inconnu ${update.id}`, errors);
    if (!event) continue;
    assert(update.set && typeof update.set === 'object', `${countryId}: ${update.id} sans set`, errors);
    if (!update.set) continue;
    for (const [key, value] of Object.entries(update.set)) {
      assert(ALLOWED_SET.has(key), `${countryId}: ${update.id} champ non autorisé ${key}`, errors);
      if (key === 'tags') {
        assert(Array.isArray(value) && value.length > 0, `${countryId}: ${update.id} tags invalides`, errors);
        for (const tag of value || []) assert(TAGS.has(tag), `${countryId}: ${update.id} tag inconnu ${tag}`, errors);
      }
      if (key === 'year') {
        assert(Number.isInteger(value), `${countryId}: ${update.id} année non entière`, errors);
        assert(value >= country.domain[0] && value <= country.domain[1], `${countryId}: ${update.id} année hors domaine`, errors);
      }
      if (key === 'endYear' && value !== null) {
        assert(Number.isInteger(value), `${countryId}: ${update.id} endYear non entier`, errors);
        assert(value >= (update.set.year ?? event.year), `${countryId}: ${update.id} endYear avant year`, errors);
        assert(value <= country.domain[1], `${countryId}: ${update.id} endYear hors domaine`, errors);
      }
      if (key === 'importance') assert([1, 2, 3].includes(value), `${countryId}: ${update.id} importance invalide`, errors);
      if (key === 'summary') assert(typeof value === 'string' && value.trim().length >= 20, `${countryId}: ${update.id} résumé trop court`, errors);
    }
    for (const source of correctionSources.get(update.id) || []) {
      assert(sourceIds.has(source), `${countryId}: ${update.id} source de correction inconnue ${source}`, errors);
    }
    countryStats.updates += 1;
  }

  for (const addition of fixes.event_additions || []) {
    assert(Number.isInteger(addition.year), `${countryId}: ${addition.id} année non entière`, errors);
    assert(addition.year >= country.domain[0] && addition.year <= country.domain[1], `${countryId}: ${addition.id} année hors domaine`, errors);
    if (addition.end_year !== null && addition.end_year !== undefined) {
      assert(Number.isInteger(addition.end_year), `${countryId}: ${addition.id} end_year non entier`, errors);
      assert(addition.end_year >= addition.year, `${countryId}: ${addition.id} end_year avant year`, errors);
      assert(addition.end_year <= country.domain[1], `${countryId}: ${addition.id} end_year hors domaine`, errors);
    }
    assert(typeof addition.title === 'string' && addition.title.trim(), `${countryId}: ${addition.id} titre manquant`, errors);
    assert(typeof addition.subtitle === 'string' && addition.subtitle.trim(), `${countryId}: ${addition.id} sous-titre manquant`, errors);
    assert(typeof addition.summary === 'string' && addition.summary.trim().length >= 40, `${countryId}: ${addition.id} résumé manquant`, errors);
    assert(Array.isArray(addition.tags) && addition.tags.length > 0, `${countryId}: ${addition.id} tags manquants`, errors);
    for (const tag of addition.tags || []) assert(TAGS.has(tag), `${countryId}: ${addition.id} tag inconnu ${tag}`, errors);
    assert([1, 2, 3].includes(addition.importance), `${countryId}: ${addition.id} importance invalide`, errors);
    for (const source of addition.sources || []) {
      assert(sourceIds.has(source), `${countryId}: ${addition.id} source inconnue ${source}`, errors);
    }
    assert(Array.isArray(addition.sources) && addition.sources.length > 0, `${countryId}: ${addition.id} sans source`, errors);
    for (const related of addition.related || []) {
      assert(allEventIds.has(related) || newIds.has(related), `${countryId}: ${addition.id} related inconnu ${related}`, errors);
    }
    countryStats.additions += 1;
  }

  for (const eraUpdate of fixes.era_updates || []) {
    const era = eraByName.get(eraUpdate.name);
    assert(Boolean(era), `${countryId}: ère inconnue ${eraUpdate.name}`, errors);
    assert(eraUpdate.set && typeof eraUpdate.set.name === 'string' && eraUpdate.set.name.trim(), `${countryId}: ère ${eraUpdate.name} sans nouveau nom`, errors);
    countryStats.eras += 1;
  }

  countryStats.unresolved = (fixes.unresolved || []).length;
  stats.countries += 1;
  stats.eventUpdates += countryStats.updates;
  stats.eventAdditions += countryStats.additions;
  stats.eraUpdates += countryStats.eras;
  stats.unresolved += countryStats.unresolved;
  stats.byCountry[countryId] = countryStats;
}

if (errors.length) {
  console.error('Patches invalides :');
  for (const error of errors) console.error(`  ✗ ${error}`);
  process.exitCode = 1;
  process.exit();
}

// Deuxième passe : appliquer en mémoire.
for (const [countryId, fixes] of fixesByCountry) {
  const country = data.countries.find((item) => item.id === countryId);
  const proposals = readProposals(countryId);
  const correctionSources = new Map(
    (proposals?.corrections || []).map((correction) => [correction.existing_id, correction.sources || []])
  );
  const eventById = new Map(country.events.map((event) => [event.id, event]));
  const eraByName = new Map(country.eras.map((era) => [era.name, era]));

  for (const update of fixes.event_updates || []) {
    const event = eventById.get(update.id);
    for (const [key, value] of Object.entries(update.set || {})) {
      if (key === 'endYear' && value === null) delete event.endYear;
      else event[key] = value;
    }
    const refs = correctionSources.get(update.id) || [];
    if (refs.length) {
      event.sources = [...new Set([...(event.sources || []), ...refs])];
    }
  }

  for (const eraUpdate of fixes.era_updates || []) {
    const era = eraByName.get(eraUpdate.name);
    if (era) era.name = eraUpdate.set.name;
  }

  for (const addition of fixes.event_additions || []) {
    const event = {
      id: addition.id,
      year: addition.year,
      title: addition.title,
      subtitle: addition.subtitle,
      tags: [...addition.tags],
      importance: addition.importance,
      summary: addition.summary,
      related: [...(addition.related || [])],
      sources: [...addition.sources],
    };
    if (addition.end_year !== null && addition.end_year !== undefined) event.endYear = addition.end_year;
    country.events.push(event);
  }

  country.events.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title, 'fr'));
}

data.meta = {
  ...data.meta,
  version: 'POC · 0.2',
  generated: '2026-11',
  integratedAt: new Date().toISOString().slice(0, 10),
};

const header = `/* Vectemporel — jeu de données (POC 0.2).
   Généré par scripts/apply-country-fixes.mjs à partir de data.js et des
   dossiers audits/<pays>/fixes.yaml. Ne pas éditer à la main : relancer
   le script après modification des patches. */

`;

const output = `${header}window.VECTEMPOREL_DATA = ${JSON.stringify(data, null, 2)};\n`;

if (DRY_RUN) {
  console.log('Mode dry-run : data.js non modifié.');
} else {
  fs.writeFileSync(path.join(ROOT, 'data.js'), output, 'utf8');
  console.log('data.js écrit.');
}

console.log('Intégration des fixes pays');
for (const [country, values] of Object.entries(stats.byCountry)) {
  console.log(`  ${country.padEnd(8)} ${values.updates} corrections, ${values.additions} ajouts, ${values.eras} ères, ${values.unresolved} restes`);
}
console.log(`  total    ${stats.eventUpdates} corrections, ${stats.eventAdditions} ajouts, ${stats.eraUpdates} ères, ${stats.unresolved} restes`);
if (warnings.length) {
  console.log('Avertissements :');
  for (const warning of warnings) console.log(`  ! ${warning}`);
}
