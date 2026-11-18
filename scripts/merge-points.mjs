#!/usr/bin/env node
/* Fusionne les propositions d'agents validées dans dataset.js.
 * Contrôle : schéma, ère, domaine, date, sources, absence de lien externe. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import YAML from 'yaml';
import { parseCsv } from './lib/csv.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DOMAIN_ALIASES = { '"Femmes': 'Femmes, genre, sexualités', '"Sciences': 'Sciences, techniques & santé' };
const normalizeDomain = (value) => DOMAIN_ALIASES[value] || value;
const OLD = path.resolve(ROOT, '..', 'vectemporel');
const FILE = path.join(ROOT, 'src/data/dataset.js');
const CONTEXT = { window: {} };
vm.createContext(CONTEXT);
vm.runInContext(fs.readFileSync(FILE, 'utf8').replace('export const DATASET =', 'window.DATASET ='), CONTEXT);
const data = CONTEXT.window.DATASET;

const errors = [];
let merged = 0;

function domainsFor(countryId) {
  const rows = parseCsv(fs.readFileSync(path.join(OLD, 'audits', countryId, 'coverage-matrix.csv'), 'utf8'));
  return new Set(rows.map((row) => row.domain).filter(Boolean));
}

function sourceIdsFor(countryId) {
  const rows = parseCsv(fs.readFileSync(path.join(OLD, 'audits', countryId, 'source-register.csv'), 'utf8'));
  const ids = new Set(rows.map((row) => row.source_id).filter(Boolean));
  const omissions = YAML.parse(fs.readFileSync(path.join(OLD, 'audits', countryId, 'omissions.yaml'), 'utf8'));
  for (const item of omissions.omissions || []) ids.add(String(item.id || ''));
  return ids;
}

const REQUIRED = ['id', 'era_id', 'domain', 'scale', 'subject', 'predicate', 'object', 'time', 'time_precision', 'families', 'actors', 'places', 'groups', 'institutions', 'normative', 'memory', 'sources', 'confidence', 'justification', 'status'];

for (const country of data.countries) {
  country.points = [];
  const dir = path.join(ROOT, 'proposals', country.id);
  if (!fs.existsSync(dir)) continue;
  const domains = domainsFor(country.id);
  const sourceIds = sourceIdsFor(country.id);
  const eraIds = new Set(country.eras.map((era) => era.id));
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.yaml'))) {
    const parsed = YAML.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const points = Array.isArray(parsed) ? parsed : (parsed?.points || []);
    for (const point of points) {
      const label = `${country.id}/${file}/${point.id || 'sans-id'}`;
      const missing = REQUIRED.filter((key) => point[key] === undefined || point[key] === null);
      if (missing.length) { errors.push(`${label} : champs manquants (${missing.join(', ')})`); continue; }
      if (!eraIds.has(point.era_id)) { errors.push(`${label} : ère inconnue`); continue; }
      if (!domains.has(normalizeDomain(point.domain))) { errors.push(`${label} : domaine inconnu`); continue; }
      if (point.status !== 'validated') { errors.push(`${label} : statut non validé`); continue; }
      if (String(point.justification).match(/grokipedia/i)) { errors.push(`${label} : lien Grokipedia`); continue; }
      const badSources = (point.sources || []).filter((source) => !sourceIds.has(String(source)));
      if (badSources.length) { errors.push(`${label} : sources inconnues (${badSources.join(', ')})`); continue; }
      const era = country.eras.find((item) => item.id === point.era_id);
      const years = String(point.time).match(/-?\d{1,5}/g)?.map(Number) || [];
      if (years.length) {
        const from = Math.min(...years);
        const to = Math.max(...years);
        if (to < era.start || from > era.end) {
          errors.push(`${label} : date hors ère`);
          continue;
        }
      }
      country.points.push({
        id: point.id,
        eraId: point.era_id,
        domain: normalizeDomain(point.domain),
        scale: point.scale,
        subject: point.subject,
        predicate: point.predicate,
        object: point.object,
        text: `${point.subject} ${point.predicate} ${point.object}`.replace(/\s+/g, ' ').trim(),
        time: point.time,
        datePrecision: point.time_precision,
        families: point.families,
        actors: point.actors || [],
        places: point.places || [],
        groups: point.groups || [],
        institutions: point.institutions || [],
        normative: point.normative || [],
        memory: point.memory || [],
        sources: point.sources || [],
        confidence: point.confidence,
        justification: point.justification,
        status: 'validated',
      });
      merged += 1;
    }
  }
}

data.meta.points += merged;
data.meta.validatedPoints = merged;
data.meta.generated = new Date().toISOString().slice(0, 10);

fs.writeFileSync(FILE, `/* Généré par scripts/build-dataset.mjs et scripts/merge-points.mjs. */\nexport const DATASET = ${JSON.stringify(data, null, 2)};\n`);
const lines = [`# Registre des points validés`, '', `${merged} points fusionnés.`, '', ...errors.map((error) => `- ERREUR : ${error}`)];
fs.writeFileSync(path.join(ROOT, 'POINT_REGISTRY.md'), `${lines.join('\n')}\n`);
console.log(`${merged} points fusionnés, ${errors.length} erreur(s). POINT_REGISTRY.md généré.`);
if (errors.length) process.exitCode = 1;
