#!/usr/bin/env node
/* Refonte documentaire des matrices de couverture.
 * Règle déterministe, aucune affirmation historique nouvelle :
 *   - point validé avec source SRC- => cellule « couvert » (entry_ids = ids des points) ;
 *   - sinon omission existante OM- => « vide justifié » (entry_ids = id de l'omission) ;
 *   - sinon omission dérivée de la justification DÉJÀ RÉDIGÉE dans les propositions
 *     => « vide justifié » avec origine tracée dans auto-omissions.yaml ;
 *   - sans justification exploitable => « partiel » (dette explicite, jamais inventée). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { DATASET } from '../src/data/dataset.js';
import { parseCsv, stringifyCsv } from './lib/csv.mjs';
import { normalizeDomain } from './lib/coverage.mjs';
import { writeFileAtomic } from './lib/atomic.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const slug = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24);
const eraIdFor = (country, periodId) => {
  const index = Number(String(periodId).match(/(\d+)/)?.[1] || 0) - 1;
  return country.eras[index]?.id || null;
};
const existingOmissions = (country) => YAML.parse(
  fs.readFileSync(path.join(ROOT, 'source', 'audits', country.id, 'omissions.yaml'), 'utf8'),
).omissions || [];
const proposalsFor = (country) => {
  const dir = path.join(ROOT, 'proposals', country.id);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((file) => file.endsWith('.yaml')).flatMap((file) => {
    const parsed = YAML.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    return Array.isArray(parsed) ? parsed : (parsed?.points || []);
  });
};

const stats = { couvert: 0, videJustifie: 0, derive: 0, partiel: 0 };

for (const country of DATASET.countries) {
  const matrixPath = path.join(ROOT, 'source', 'audits', country.id, 'coverage-matrix.csv');
  const rows = parseCsv(fs.readFileSync(matrixPath, 'utf8'));
  if (!rows.length) throw new Error(`Matrice vide : ${country.id}`);
  const header = Object.keys(rows[0]);
  const points = proposalsFor(country)
    .filter((point) => point.status === 'validated')
    .map((point) => ({ ...point, domain: normalizeDomain(point.domain) }));
  const omissions = existingOmissions(country);
  const derived = [];
  const usedIds = new Set(omissions.map((item) => String(item.id)));
  const cellsWithOm = new Set();
  const nextId = (base) => {
    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) id = `${base}-${suffix++}`;
    usedIds.add(id);
    return id;
  };

  const reclassified = rows.map((row) => {
    const eraId = eraIdFor(country, row.period_id);
    const domain = normalizeDomain(row.domain);
    const cell = points.filter((point) => point.era_id === eraId && point.domain === domain);
    const sourced = cell.filter((point) => (point.sources || []).some((source) => /^SRC-/.test(String(source))));

    if (sourced.length) {
      stats.couvert += 1;
      return { ...row, status: 'couvert', entry_ids: [...new Set(sourced.map((point) => point.id))].sort().join(';') };
    }

    const existing = omissions.find((item) => item.period_id === row.period_id
      && normalizeDomain(item.domain) === domain);
    if (existing) {
      cellsWithOm.add(`${eraId}|${domain}`);
      stats.videJustifie += 1;
      return { ...row, status: 'vide justifié', entry_ids: String(existing.id) };
    }

    const justification = String(cell[0]?.justification || row.justification || '').trim();
    if (!justification) {
      stats.partiel += 1;
      return { ...row, status: 'partiel', entry_ids: '' };
    }
    const period = String(row.period_id).match(/(\d+)/)?.[1] || '0';
    const id = nextId(`OM-AUTO-${country.code}-${period.padStart(2, '0')}-${slug(domain)}`);
    cellsWithOm.add(`${eraId}|${domain}`);
    derived.push({
      id,
      period_id: row.period_id,
      domain: row.domain,
      justification,
      origin: 'auto-from-justification',
      source_point_id: cell[0]?.id || null,
    });
    stats.derive += 1;
    return { ...row, status: 'vide justifié', entry_ids: id };
  });

  /* Points isolés sans source dans une cellule déjà couverte : omission au
   * niveau du point, même justification d'origine, aucun fait nouveau. */
  for (const point of points) {
    if ((point.sources || []).length) continue;
    const key = `${point.era_id}|${normalizeDomain(point.domain)}`;
    if (cellsWithOm.has(key)) continue;
    const justification = String(point.justification || '').trim();
    if (!justification) continue;
    const id = nextId(`OM-AUTO-${country.code}-PT-${slug(point.id)}`);
    derived.push({
      id,
      period_id: `ERA-${country.eras.findIndex((era) => era.id === point.era_id) + 1}`,
      domain: point.domain,
      justification,
      origin: 'auto-from-justification',
      source_point_id: point.id,
      scope: 'point',
    });
    stats.derive += 1;
  }

  writeFileAtomic(matrixPath, stringifyCsv(reclassified, header));
  const autoPath = path.join(ROOT, 'source', 'audits', country.id, 'auto-omissions.yaml');
  writeFileAtomic(autoPath, YAML.stringify({
    schema_version: '1.0',
    country_id: country.id,
    generated_by: 'scripts/reclassify-matrix.mjs',
    rule: 'justification existante des propositions, aucun fait nouveau',
    omissions: derived,
  }, { lineWidth: 0 }));
  console.log(`${country.id}: ${reclassified.length} cellules, ${derived.length} omissions dérivées.`);
}

console.log(JSON.stringify(stats));
if (stats.partiel) process.exitCode = 1;
