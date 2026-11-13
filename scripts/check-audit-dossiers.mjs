#!/usr/bin/env node
/*
 * Vectemporel — contrôle structurel des dossiers pays (méthode v1.0).
 *
 * Vérifie que chaque dossier `audits/<pays>/` contient les six livrables,
 * que les CSV ont le bon en-tête, que les propositions citent des sources
 * du registre et que les volumes minimaux sont atteints.
 *
 * Ce script ne juge pas la qualité historique des contenus.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const COUNTRIES = ['france', 'uk', 'usa', 'germany', 'italy', 'spain', 'china', 'india', 'japan', 'egypt'];
const REQUIRED = [
  'country-audit.yaml',
  'coverage-matrix.csv',
  'source-register.csv',
  'omissions.yaml',
  'proposals.yaml',
  'REPORT.md',
];
const MINIMUMS = {
  sources: 12,
  events: 12,
  actors: 8,
  places: 8,
  omissions: 8,
  matrixRowsPerEra: 14,
};

function loadData() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'), context);
  return context.window.VECTEMPOREL_DATA;
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function readCsv(file) {
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { header: [], rows: [] };
  return {
    header: parseCsvLine(lines[0]),
    rows: lines.slice(1).map(parseCsvLine),
  };
}

function countMatches(text, regex) {
  return (text.match(regex) || []).length;
}

function checkCountry(country, dataCountry) {
  const dir = path.join(ROOT, 'audits', country);
  const errors = [];
  const warnings = [];
  const files = {};

  for (const name of REQUIRED) {
    const file = path.join(dir, name);
    const exists = fs.existsSync(file);
    const size = exists ? fs.statSync(file).size : 0;
    files[name] = { exists, size };
    if (!exists) errors.push(`fichier manquant : ${name}`);
    else if (size < 20) errors.push(`fichier vide ou trop court : ${name}`);
  }

  const matrix = readCsv(path.join(dir, 'coverage-matrix.csv'));
  if (matrix) {
    const expectedHeader = [
      'period_id',
      'period_label',
      'start_edtf',
      'end_edtf',
      'scale',
      'domain',
      'status',
      'entry_ids',
      'justification',
      'reviewer',
      'last_review',
    ];
    if (matrix.header.join(',') !== expectedHeader.join(',')) {
      errors.push('coverage-matrix.csv : en-tête non conforme');
    }
    const badRows = matrix.rows.filter((row) => row.length !== expectedHeader.length);
    if (badRows.length) errors.push(`coverage-matrix.csv : ${badRows.length} ligne(s) avec un mauvais nombre de colonnes`);
    const expectedRows = dataCountry.eras.length * MINIMUMS.matrixRowsPerEra;
    if (matrix.rows.length < expectedRows) {
      errors.push(`coverage-matrix.csv : ${matrix.rows.length} lignes, attendu au moins ${expectedRows}`);
    }
    const statuses = new Set(['couvert', 'partiel', 'vide justifié', 'vide non traité']);
    const badStatus = matrix.rows.filter((row) => !statuses.has((row[6] || '').trim()));
    if (badStatus.length) errors.push(`coverage-matrix.csv : ${badStatus.length} statut(s) inconnu(s)`);
  }

  const sources = readCsv(path.join(dir, 'source-register.csv'));
  let sourceIds = new Set();
  if (sources) {
    if (sources.header[0] !== 'source_id') errors.push('source-register.csv : en-tête non conforme');
    sourceIds = new Set(sources.rows.map((row) => (row[0] || '').trim()).filter(Boolean));
    if (sourceIds.size < MINIMUMS.sources) {
      errors.push(`source-register.csv : ${sourceIds.size} sources, attendu au moins ${MINIMUMS.sources}`);
    }
    const withoutLink = sources.rows.filter((row) => !(row[8] || '').trim() && !(row[9] || '').trim());
    if (withoutLink.length) warnings.push(`source-register.csv : ${withoutLink.length} source(s) sans DOI ni URL`);
  }

  const proposalsText = fs.existsSync(path.join(dir, 'proposals.yaml'))
    ? fs.readFileSync(path.join(dir, 'proposals.yaml'), 'utf8')
    : '';
  const eventCount = countMatches(proposalsText, /^\s*-\s+id:\s*"?PROP-/gm);
  const actorCount = countMatches(proposalsText, /^\s*-\s+id:\s*"?ACTOR-PROP-/gm);
  const placeCount = countMatches(proposalsText, /^\s*-\s+id:\s*"?PLACE-PROP-/gm);
  if (eventCount < MINIMUMS.events) errors.push(`proposals.yaml : ${eventCount} événements, attendu au moins ${MINIMUMS.events}`);
  if (actorCount < MINIMUMS.actors) errors.push(`proposals.yaml : ${actorCount} acteurs, attendu au moins ${MINIMUMS.actors}`);
  if (placeCount < MINIMUMS.places) errors.push(`proposals.yaml : ${placeCount} lieux, attendu au moins ${MINIMUMS.places}`);

  const referencedSources = new Set(proposalsText.match(/SRC-\d{3}/g) || []);
  const unknownSources = [...referencedSources].filter((id) => !sourceIds.has(id));
  if (unknownSources.length) {
    errors.push(`proposals.yaml : sources absentes du registre (${unknownSources.join(', ')})`);
  }
  if (referencedSources.size === 0) warnings.push('proposals.yaml : aucune source citée');

  const omissionsText = fs.existsSync(path.join(dir, 'omissions.yaml'))
    ? fs.readFileSync(path.join(dir, 'omissions.yaml'), 'utf8')
    : '';
  const omissionCount = countMatches(omissionsText, /^\s*-\s+id:\s*"?OM-/gm);
  if (omissionCount < MINIMUMS.omissions) {
    errors.push(`omissions.yaml : ${omissionCount} omissions, attendu au moins ${MINIMUMS.omissions}`);
  }

  const auditText = fs.existsSync(path.join(dir, 'country-audit.yaml'))
    ? fs.readFileSync(path.join(dir, 'country-audit.yaml'), 'utf8')
    : '';
  if (!/verdict:\s*"?pending"?/i.test(auditText)) {
    errors.push('country-audit.yaml : verdict non renseigné à pending');
  }
  if (!/schema_version:\s*['"]?1\.0['"]?/i.test(auditText)) {
    warnings.push('country-audit.yaml : schema_version 1.0 absent');
  }

  const reportText = fs.existsSync(path.join(dir, 'REPORT.md'))
    ? fs.readFileSync(path.join(dir, 'REPORT.md'), 'utf8')
    : '';
  const reportSections = countMatches(reportText, /^##\s+[1-7]\./gm);
  if (reportSections < 7) {
    warnings.push(`REPORT.md : ${reportSections}/7 sections numérotées`);
  }

  return {
    country,
    errors,
    warnings,
    counts: {
      sources: sourceIds.size,
      events: eventCount,
      actors: actorCount,
      places: placeCount,
      omissions: omissionCount,
      matrixRows: matrix ? matrix.rows.length : 0,
    },
    files,
  };
}

const data = loadData();
const results = COUNTRIES.map((countryId) => {
  const dataCountry = data.countries.find((item) => item.id === countryId);
  if (!dataCountry) throw new Error(`Pays absent de data.js : ${countryId}`);
  return checkCountry(countryId, dataCountry);
});

console.log('Contrôle des dossiers pays — méthode v1.0');
console.log('');
console.log('Pays        Sources  Évén.  Acteurs  Lieux  Omissions  Matrice  Statut');
for (const result of results) {
  const { counts } = result;
  const status = result.errors.length ? 'ERREUR' : result.warnings.length ? 'À REVOIR' : 'OK';
  console.log(
    `${result.country.padEnd(11)} ${String(counts.sources).padStart(7)} ${String(counts.events).padStart(6)} ${String(
      counts.actors
    ).padStart(8)} ${String(counts.places).padStart(6)} ${String(counts.omissions).padStart(10)} ${String(
      counts.matrixRows
    ).padStart(8)}  ${status}`
  );
  for (const message of result.errors) console.log(`  ✗ ${message}`);
  for (const message of result.warnings) console.log(`  ! ${message}`);
}

const errorCount = results.reduce((sum, result) => sum + result.errors.length, 0);
const warningCount = results.reduce((sum, result) => sum + result.warnings.length, 0);
console.log('');
console.log(`Bilan : ${errorCount} erreur(s), ${warningCount} avertissement(s).`);
process.exitCode = errorCount > 0 ? 1 : 0;
