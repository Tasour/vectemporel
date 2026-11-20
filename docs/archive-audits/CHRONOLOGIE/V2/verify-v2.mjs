#!/usr/bin/env node
/* Vérification d'ensemble des 100 lentilles V2 CHRONOLOGIE (orchestrateur).
   Les commentaires sont retirés avant contrôle des motifs interdits :
   les modules documentent volontairement « zéro console.*, zéro Math.random… ». */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const JS = join(ROOT, 'src/views/chronology/v2');
const MD = join(ROOT, 'UNIFIED_AUDIT/CHRONOLOGIE/V2/views');
const pad = (n) => String(n).padStart(3, '0');
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1 ');
const stripStrings = (s) => s.replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, "''");
const forbidden = [
  ['console.*', /console\s*\./], ['fetch', /\bfetch\s*\(/],
  ['XHR', /XMLHttpRequest/], ['Math.random', /Math\.random/],
  ['innerHTML', /innerHTML/], ['import distant', /import\s*\(\s*['"]https?:/],
];

const problems = [];
let jsOk = 0, mdOk = 0, chantiersOk = 0, cssOk = 0;

for (let i = 1; i <= 100; i++) {
  const id = `E${pad(i)}`;
  const jf = join(JS, `${id}.js`);
  const mf = join(MD, `${id}.md`);
  if (!existsSync(jf)) { problems.push(`${id}.js MANQUANT`); continue; }
  const raw = readFileSync(jf, 'utf8');
  const code = stripComments(raw);
  if (!/^import \{ register \} from '\.\/registry\.js';/m.test(raw)) problems.push(`${id}: import register absent`);
  const regMatches = code.match(new RegExp(`^\\s*register\\(\\s*'${id}'\\s*,`, 'gm')) || [];
  if (regMatches.length !== 1) problems.push(`${id}: register('${id}') x${regMatches.length}`);
  const cssId = `chronology-v2-e${pad(i)}`;
  if (raw.includes(cssId)) cssOk++; else problems.push(`${id}: id CSS ${cssId} absent`);
  const noStrings = stripStrings(code);
  for (const [label, re] of forbidden) if (re.test(noStrings)) problems.push(`${id}: motif interdit ${label}`);
  try { execFileSync(process.execPath, ['--check', jf], { stdio: 'pipe' }); jsOk++; }
  catch { problems.push(`${id}: node --check ECHEC`); }

  if (existsSync(mf)) {
    const rep = readFileSync(mf, 'utf8');
    let n = 0;
    for (let c = 1; c <= 10; c++) {
      const tag = `${id}-${String(c).padStart(2, '0')}`;
      if (rep.includes(tag)) n++;
    }
    if (n === 10) chantiersOk++; else problems.push(`${id}: rapport ${n}/10 chantiers`);
    if (rep.startsWith('# ' + id) && rep.includes('Vérification')) mdOk++;
    else problems.push(`${id}.md structure incomplete`);
  } else problems.push(`${id}.md MANQUANT`);
}

console.log(`JS node --check OK : ${jsOk}/100`);
console.log(`ID CSS présent : ${cssOk}/100`);
console.log(`Rapports MD structurés : ${mdOk}/100`);
console.log(`10 chantiers dans le rapport : ${chantiersOk}/100`);
console.log(`Problèmes : ${problems.length}`);
if (problems.length) console.log(problems.join('\n'));
process.exit(problems.length ? 1 : 0);
