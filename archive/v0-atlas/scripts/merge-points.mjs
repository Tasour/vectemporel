#!/usr/bin/env node
/* Fusionne les propositions d'agents validées dans dataset.js.
 * Contrôle : schéma, ère, domaine, date, sources, absence de lien externe. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import YAML from 'yaml';
import { parseCsv } from './lib/csv.mjs';
import { writeFileAtomic } from './lib/atomic.mjs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DOMAIN_ALIASES = { '"Femmes': 'Femmes, genre, sexualités', '"Sciences': 'Sciences, techniques & santé' };
const normalizeDomain = (value) => DOMAIN_ALIASES[value] || value;
const CONFIDENCE_ALIASES = Object.freeze({ disputed: 'disputé', contesté: 'disputé' });
const normalizeConfidence = (value) => CONFIDENCE_ALIASES[String(value)] || String(value);
const PRECISION = new Set(['year', 'month', 'day', 'interval', 'range', 'circa', 'century', 'unknown']);
function normalizePrecision(value) {
  const text = String(value ?? '').trim();
  if (PRECISION.has(text)) return text;
  if (/^intervalle|^intervalle entre/.test(text)) return 'interval';
  if (/^année/.test(text)) return 'year';
  if (!text) return 'unknown';
  return 'unknown';
}
const OLD = path.join(ROOT, 'source');
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

function autoOmissionsFor(country) {
  const file = path.join(OLD, 'audits', country.id, 'auto-omissions.yaml');
  const parsed = fs.existsSync(file) ? YAML.parse(fs.readFileSync(file, 'utf8')) : { omissions: [] };
  const byCell = new Map();
  const byPoint = new Map();
  const baseFile = path.join(OLD, 'audits', country.id, 'omissions.yaml');
  const base = fs.existsSync(baseFile) ? YAML.parse(fs.readFileSync(baseFile, 'utf8')) : { omissions: [] };
  for (const item of [...(base.omissions || []), ...(parsed.omissions || [])]) {
    const index = Number(String(item.period_id).match(/(\d+)/)?.[1] || 0) - 1;
    const eraId = country.eras[index]?.id;
    if (eraId && item.scope !== 'point') byCell.set(`${eraId}|${normalizeDomain(item.domain)}`, String(item.id));
    if (item.source_point_id) byPoint.set(String(item.source_point_id), String(item.id));
  }
  return { ids: new Set([...byCell.values(), ...byPoint.values()]), byCell, byPoint };
}

function sourceIdsFor(countryId, extraIds) {
  const rows = parseCsv(fs.readFileSync(path.join(OLD, 'audits', countryId, 'source-register.csv'), 'utf8'));
  const ids = new Set(rows.map((row) => row.source_id).filter(Boolean));
  const omissions = YAML.parse(fs.readFileSync(path.join(OLD, 'audits', countryId, 'omissions.yaml'), 'utf8'));
  for (const item of omissions.omissions || []) ids.add(String(item.id || ''));
  for (const id of extraIds) ids.add(id);
  return ids;
}

const REQUIRED = ['id', 'era_id', 'domain', 'scale', 'subject', 'predicate', 'object', 'time', 'time_precision', 'families', 'actors', 'places', 'groups', 'institutions', 'normative', 'memory', 'sources', 'confidence', 'justification', 'status'];

for (const country of data.countries) {
  country.points = [];
  const dir = path.join(ROOT, 'proposals', country.id);
  if (!fs.existsSync(dir)) continue;
  const domains = domainsFor(country.id);
  const auto = autoOmissionsFor(country);
  const sourceIds = sourceIdsFor(country.id, auto.ids);
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
      /* Un point sans source n'est jamais une certitude : rétrogradation
       * déterministe et traçable, puis rattachement à l'omission de sa cellule. */
      const sources = (point.sources || []).map(String);
      let confidence = normalizeConfidence(point.confidence);
      let confidenceOriginal = null;
      if (!sources.length) {
        if (confidence !== 'non documenté') {
          confidenceOriginal = confidence;
          confidence = 'non documenté';
        }
        const omissionId = auto.byPoint.get(String(point.id))
          || auto.byCell.get(`${point.era_id}|${normalizeDomain(point.domain)}`);
        if (omissionId) sources.push(omissionId);
      }
      if (!sources.length) { errors.push(`${label} : aucune source ni omission de cellule`); continue; }
      const badSources = sources.filter((source) => !sourceIds.has(source));
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
        datePrecision: normalizePrecision(point.time_precision),
        families: point.families,
        actors: point.actors || [],
        places: point.places || [],
        groups: point.groups || [],
        institutions: point.institutions || [],
        normative: point.normative || [],
        memory: point.memory || [],
        sources,
        confidence,
        ...(confidenceOriginal ? { confidenceOriginal } : {}),
        justification: point.justification,
        status: 'extrait',
      });
      merged += 1;
    }
  }
}

/* Une seule grandeur, calculée depuis sa source : jamais de `+=` sur un compteur
 * déjà chargé. `generated` appartient à build-dataset.mjs et n'est pas réécrit ici. */
const eventPoints = data.countries.reduce((sum, country) => sum
  + country.events.reduce((total, event) => total + (Array.isArray(event.points) ? event.points.length : 0), 0), 0);
data.meta.eventPoints = eventPoints;
data.meta.validatedPoints = merged;
data.meta.points = eventPoints + merged;

writeFileAtomic(FILE, `/* Généré par scripts/build-dataset.mjs et scripts/merge-points.mjs. */\nexport const DATASET = ${JSON.stringify(data, null, 2)};\n`);
const lines = [`# Registre des points validés`, '', `${merged} points fusionnés.`, '', ...errors.map((error) => `- ERREUR : ${error}`)];
writeFileAtomic(path.join(ROOT, 'POINT_REGISTRY.md'), `${lines.join('\n')}\n`);
console.log(`${merged} points fusionnés, ${errors.length} erreur(s). POINT_REGISTRY.md généré.`);
if (errors.length) process.exitCode = 1;
