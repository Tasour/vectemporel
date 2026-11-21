#!/usr/bin/env node
/* Preuve que verify:points échoue quand la couverture régresse (mutation test). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vatlas-coverage-'));
try {
  for (const dir of ['scripts', 'source', 'proposals']) {
    fs.cpSync(path.join(ROOT, dir), path.join(tmp, dir), { recursive: true });
  }
  fs.mkdirSync(path.join(tmp, 'src', 'data'), { recursive: true });
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(tmp, 'node_modules'), 'dir');

  const run = (script) => spawnSync(process.execPath, [`scripts/${script}.mjs`], {
    cwd: tmp, encoding: 'utf8', timeout: 120_000,
  });

  check('build:data', run('build-dataset').status === 0);
  check('build:points', run('merge-points').status === 0);
  check('report:coverage', run('report-coverage').status === 0);
  const before = fs.readFileSync(path.join(tmp, 'COVERAGE_POINTS.md'), 'utf8');
  check('verify:points vert avant mutation', run('verify-points').status === 0);
  const after = fs.readFileSync(path.join(tmp, 'COVERAGE_POINTS.md'), 'utf8');
  check('verify:points ne réécrit pas l’artefact', before === after);

  const dir = path.join(tmp, 'proposals', 'france');
  const candidate = fs.readdirSync(dir).filter((file) => file.endsWith('.yaml'))[0];
  const mutating = path.join(dir, candidate);
  const quarantined = `${mutating}.muted`;
  fs.renameSync(mutating, quarantined);
  const mutated = run('verify-points');
  check('verify:points échoue après retrait d’un YAML', mutated.status === 1,
    `status=${mutated.status} sortie=${mutated.stdout.trim().slice(0, 80)}`);
  fs.renameSync(quarantined, mutating);
  check('verify:points redevient vert', run('verify-points').status === 0);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(failed ? `${failed} échec(s)` : 'Garde-fou de couverture vérifié.');
process.exit(failed ? 1 : 0);
