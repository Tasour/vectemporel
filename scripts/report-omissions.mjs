#!/usr/bin/env node
/* P2-06 — journal déterministe des omissions et absences justifiées.
 * Lit les omissions humaines et les omissions dérivées, sans rien inventer. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { writeFileAtomic } from './lib/atomic.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'docs', 'arbitrage-omissions.md');
const lines = [
  '# Journal des omissions et absences justifiées',
  '',
  `Généré le ${new Date().toISOString().slice(0, 10)} par \`npm run report:omissions\`.`,
  '',
  'Deux origines distinctes : les omissions **revues par un auditeur** (`omissions.yaml`) et les absences **dérivées automatiquement** d’une justification déjà rédigée (`auto-omissions.yaml`). Ces dernières ne valident pas un fait nouveau : elles signalent un silence documenté.',
  '',
];
const totals = { human: 0, derived: 0, toFill: 0, documented: 0, accepted: 0 };

for (const country of ['france', 'uk', 'usa', 'germany', 'italy', 'spain', 'china', 'india', 'japan', 'egypt']) {
  const dir = path.join(ROOT, 'source', 'audits', country);
  const humanPath = path.join(dir, 'omissions.yaml');
  const autoPath = path.join(dir, 'auto-omissions.yaml');
  const human = fs.existsSync(humanPath) ? (YAML.parse(fs.readFileSync(humanPath, 'utf8')).omissions || []) : [];
  const auto = fs.existsSync(autoPath) ? (YAML.parse(fs.readFileSync(autoPath, 'utf8')).omissions || []) : [];
  const statuses = human.reduce((acc, item) => {
    const status = String(item.status || 'inconnu');
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  totals.human += human.length;
  totals.derived += auto.length;
  totals.toFill += statuses.to_fill || 0;
  totals.documented += statuses.documented || 0;
  totals.accepted += statuses.accepted || 0;
  lines.push(`## ${country}`);
  lines.push('', `- omissions revues : ${human.length} (${Object.entries(statuses).map(([k, v]) => `${k} ${v}`).join(', ') || 'aucune'})`,
    `- absences dérivées : ${auto.length}`, '');
  const reviewed = human.filter((item) => ['documented', 'accepted'].includes(String(item.status)));
  if (reviewed.length) {
    lines.push('| ID | Ère | Domaine | Statut |', '| --- | --- | --- | --- |');
    for (const item of reviewed) {
      lines.push(`| ${item.id} | ${item.period_id || ''} | ${String(item.domain || '').replace(/\|/g, '\\|')} | ${item.status} |`);
    }
    lines.push('');
  }
}

lines.splice(2, 0, `**Totaux** : ${totals.human} omissions revues (${totals.toFill} à combler, ${totals.documented} documentées, ${totals.accepted} acceptées) et ${totals.derived} absences dérivées.`, '');
while (lines.length && lines[lines.length - 1] === '') lines.pop();
writeFileAtomic(OUT, `${lines.join('\n')}\n`);
console.log(`Journal généré : ${totals.human} revues, ${totals.derived} dérivées → docs/arbitrage-omissions.md`);
