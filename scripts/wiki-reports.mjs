#!/usr/bin/env node
/* Régénère les deux récits depuis les articles Wikipédia complets via le
 * harnais Noeta v2.3 (profil §17). Le texte est conservé et attribué CC BY-SA 4.0.
 * Le cache local du harnais permet --offline après la première récupération. */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOETA = '/home/tasour/Projects/noeta';
const PYTHON = '/home/tasour/Projects/football-visual/.venv/bin/python';
const offline = process.argv.includes('--offline') ? ['--offline'] : [];

const reports = [
  {
    id: 'dauphine',
    url: 'https://fr.wikipedia.org/wiki/Dauphin%C3%A9',
    grok: 'https://grokipedia.com/page/Dauphin%C3%A9',
    conflicts: ['prix 1349|sources divergentes|aucun chiffre retenu|decision'],
  },
  {
    id: 'catholicisme',
    url: 'https://fr.wikipedia.org/wiki/Catholicisme',
    grok: 'https://grokipedia.com/page/Catholicism',
    conflicts: [
      'effectifs|1,345 milliard en 2019|1,406 milliard en 2023|arrondi commun 1,4 milliard retenu',
      'nom catholicisme|1595 chez Charron|Réforme 1517 sans date du mot|1595 retenu avec Wikipédia',
    ],
  },
];

for (const report of reports) {
  const args = [
    `${NOETA}/bin/noeta.mjs`, 'wiki', report.url,
    `/tmp/opencode/wiki-${report.id}.html`,
    '--grok', report.grok,
    '--images', '8',
    '--derogation',
    '--app-out', `${ROOT}/public/reports/${report.id}.html`,
    '--manifest', `${NOETA}/docs/wiki-convergence/${report.id}.json`,
    ...offline,
  ];
  for (const conflict of report.conflicts) args.push('--conflict', conflict);
  const output = execFileSync(process.execPath, args, { encoding: 'utf8', cwd: NOETA });
  console.log(output.trim());
}
