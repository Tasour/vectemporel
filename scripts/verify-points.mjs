#!/usr/bin/env node
/*Vérifie la couverture explicite des propositions.*/
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import YAML from 'yaml';
import { parseCsv } from './lib/csv.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DOMAIN_ALIASES = { '"Femmes': 'Femmes, genre, sexualités', '"Sciences': 'Sciences, techniques & santé' };
const normalizeDomain = (value) => DOMAIN_ALIASES[value] || value;
const OLD = path.resolve(ROOT, '..', 'vectemporel');
const CONTEXT = { window: {} };
vm.createContext(CONTEXT);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data/dataset.js'), 'utf8').replace('export const DATASET =', 'window.DATASET ='), CONTEXT);
const data = CONTEXT.window.DATASET;
let total = 0;
let covered = 0;
const missing = [];
const invalid = [];

for (const country of data.countries) {
  const rows = parseCsv(fs.readFileSync(path.join(OLD, 'audits', country.id, 'coverage-matrix.csv'), 'utf8'));
  const domains = [...new Set(rows.map((row) => row.domain).filter(Boolean))];
  const dir = path.join(ROOT, 'proposals', country.id);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((file) => file.endsWith('.yaml')) : [];
  const proposals = files.flatMap((file) => {
    try {
      const parsed = YAML.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      return Array.isArray(parsed) ? parsed : (parsed?.points || []);
    } catch (error) {
      invalid.push(`${country.id}/${file} : YAML invalide (${error.message})`);
      return [];
    }
  });
  for (const point of proposals) {
    if (!point.id || !point.era_id || !point.domain || point.status !== 'validated') {
      invalid.push(`${country.id}/${point.id || 'sans-id'} : champs obligatoires ou statut`);
    }
  }
  for (const era of country.eras) {
    for (const domain of domains) {
      total += 1;
      const ok = proposals.some((point) => point.era_id === era.id && normalizeDomain(point.domain) === domain && point.status === 'validated');
      if (ok) covered += 1;
      else missing.push(`${country.id}/${era.id}/${domain}`);
    }
  }
}
const pct = total ? Math.round((covered / total) * 100) : 0;
console.log(`Couverture explicite : ${covered}/${total} (${pct} %)`);
console.log(`Points proposés : ${invalid.length ? `${invalid.length} anomalie(s)` : 'valides'}`);
if (missing.length) console.log(`Manquants : ${missing.length}`);
for (const item of missing.slice(0, 20)) console.log(`- ${item}`);
for (const item of invalid.slice(0, 20)) console.log(`ERREUR ${item}`);
fs.writeFileSync(path.join(ROOT, 'COVERAGE_POINTS.md'), `# Couverture des points\n\n${covered}/${total} cellules validées (${pct} %).\n\n${missing.length ? `## Manquants\n\n${missing.map((item) => `- ${item}`).join('\n')}\n` : ''}${invalid.length ? `## Anomalies\n\n${invalid.map((item) => `- ${item}`).join('\n')}\n` : ''}`);
