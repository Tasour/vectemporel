/* Source unique du calcul de couverture — utilisée par verify:points et report:coverage.
 * Exemption verrou : scripts CLI monoprocess, une seule exécution par commande ;
 * la concurrence entre deux commandes est empêchée par l'orchestrateur (-date : 2026-11-20). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import YAML from 'yaml';
import { parseCsv } from './csv.mjs';

const DOMAIN_ALIASES = { '"Femmes': 'Femmes, genre, sexualités', '"Sciences': 'Sciences, techniques & santé' };
export const normalizeDomain = (value) => DOMAIN_ALIASES[value] || value;

export function computeCoverage(ROOT) {
  const CONTEXT = { window: {} };
  vm.createContext(CONTEXT);
  const source = fs.readFileSync(path.join(ROOT, 'src/data/dataset.js'), 'utf8')
    .replace('export const DATASET =', 'window.DATASET =');
  vm.runInContext(source, CONTEXT);
  const data = CONTEXT.window.DATASET;
  if (!data || !Array.isArray(data.countries)) throw new Error('dataset.js invalide');

  let total = 0;
  let covered = 0;
  const breakdown = { couvert: 0, videJustifie: 0, derive: 0 };
  const missing = [];
  const invalid = [];

  for (const country of data.countries) {
    const matrixPath = path.join(ROOT, 'source', 'audits', country.id, 'coverage-matrix.csv');
    const rows = parseCsv(fs.readFileSync(matrixPath, 'utf8'));
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
    const omissions = new Set();
    for (const file of ['omissions.yaml', 'auto-omissions.yaml']) {
      const fileId = path.join(ROOT, 'source', 'audits', country.id, file);
      if (!fs.existsSync(fileId)) continue;
      for (const item of YAML.parse(fs.readFileSync(fileId, 'utf8')).omissions || []) omissions.add(String(item.id));
    }
    for (const row of rows) {
      if (row.status === 'couvert') breakdown.couvert += 1;
      if (row.status === 'vide justifié') {
        breakdown.videJustifie += 1;
        if (row.entry_ids.startsWith('OM-AUTO-')) breakdown.derive += 1;
      }
      const label = `${country.id}/${row.period_id}/${row.domain}`;
      if (!['couvert', 'vide justifié'].includes(row.status)) invalid.push(`${label} : statut ${row.status}`);
      if (!row.entry_ids) invalid.push(`${label} : entry_ids vide`);
      if (row.status === 'couvert' && !row.entry_ids.split(';').some((id) => proposals.some((point) => point.id === id && point.status === 'validated'))) {
        invalid.push(`${label} : point couvert introuvable`);
      }
      if (row.status === 'vide justifié' && !row.entry_ids.split(';').some((id) => omissions.has(id))) {
        invalid.push(`${label} : omission inconnue (${row.entry_ids})`);
      }
    }
    for (const era of country.eras) {
      for (const domain of domains) {
        total += 1;
        const ok = proposals.some((point) => point.era_id === era.id
          && normalizeDomain(point.domain) === domain && point.status === 'validated');
        if (ok) covered += 1;
        else missing.push(`${country.id}/${era.id}/${domain}`);
      }
    }
  }
  return { total, covered, breakdown, missing, invalid };
}

export function formatCoverageReport({ total, covered, breakdown, missing, invalid }) {
  const pct = total ? Math.round((covered / total) * 100) : 0;
  const detail = breakdown
    ? `${breakdown.couvert} couvertes · ${breakdown.videJustifie} absences justifiées (dont ${breakdown.derive} dérivées d'une justification existante)`
    : '';
  const lines = ['# Couverture des points', '', `${covered}/${total} cellules validées (${pct} %).`, '', detail, ''];
  if (missing.length) lines.push('## Manquants', '', ...missing.map((item) => `- ${item}`), '');
  if (invalid.length) lines.push('## Anomalies', '', ...invalid.map((item) => `- ${item}`), '');
  return `${lines.join('\n')}\n`;
}
