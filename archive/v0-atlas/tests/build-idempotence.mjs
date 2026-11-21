#!/usr/bin/env node
/* Harnais d'idempotence : deux générations complètes doivent produire des octets identiques.
 * Exécuté dans un répertoire temporaire isolé ; le dépôt réel n'est jamais modifié. */
import crypto from 'node:crypto';
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vatlas-idem-'));
try {
  for (const dir of ['scripts', 'source', 'proposals']) {
    fs.cpSync(path.join(ROOT, dir), path.join(tmp, dir), { recursive: true });
  }
  fs.mkdirSync(path.join(tmp, 'src', 'data'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'public', 'images'), { recursive: true });
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(tmp, 'node_modules'), 'dir');

  const run = (script) => {
    const result = spawnSync(process.execPath, [`scripts/${script}.mjs`], {
      cwd: tmp, encoding: 'utf8', timeout: 120_000,
    });
    if (result.error) throw result.error;
    return result;
  };

  const build = run('build-dataset');
  check('build:data réussit', build.status === 0, build.stderr.slice(-300));
  let reclassify = run('reclassify-matrix');
  check('reclassify réussit (1)', reclassify.status === 0, reclassify.stderr.slice(-300));
  let merge = run('merge-points');
  check('build:points réussit (1)', merge.status === 0, merge.stderr.slice(-300));
  let report = run('report-coverage');
  check('report:coverage réussit (1)', report.status === 0, report.stderr.slice(-300));

  const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(tmp, file))).digest('hex');
  const first = {
    dataset: sha('src/data/dataset.js'),
    registry: sha('POINT_REGISTRY.md'),
    coverage: sha('COVERAGE_POINTS.md'),
    matrix: sha('source/audits/france/coverage-matrix.csv'),
    autoOmissions: sha('source/audits/france/auto-omissions.yaml'),
  };

  const rebuild = run('build-dataset');
  check('build:data réussit (2)', rebuild.status === 0, rebuild.stderr.slice(-300));
  reclassify = run('reclassify-matrix');
  check('reclassify réussit (2)', reclassify.status === 0, reclassify.stderr.slice(-300));
  merge = run('merge-points');
  check('build:points réussit (2)', merge.status === 0, merge.stderr.slice(-300));
  report = run('report-coverage');
  check('report:coverage réussit (2)', report.status === 0, report.stderr.slice(-300));

  const second = {
    dataset: sha('src/data/dataset.js'),
    registry: sha('POINT_REGISTRY.md'),
    coverage: sha('COVERAGE_POINTS.md'),
    matrix: sha('source/audits/france/coverage-matrix.csv'),
    autoOmissions: sha('source/audits/france/auto-omissions.yaml'),
  };

  for (const key of Object.keys(first)) {
    check(`${key} stable`, first[key] === second[key], `${first[key].slice(0, 12)} vs ${second[key].slice(0, 12)}`);
  }

  const source = fs.readFileSync(path.join(tmp, 'src/data/dataset.js'), 'utf8');
  const meta = JSON.parse(source.match(/export const DATASET = ([\s\S]*);\s*$/)[1]).meta;
  check('meta.eventPoints = 901', meta.eventPoints === 901, String(meta.eventPoints));
  check('meta.validatedPoints = 845', meta.validatedPoints === 845, String(meta.validatedPoints));
  check('meta.points = somme', meta.points === meta.eventPoints + meta.validatedPoints, String(meta.points));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(failed ? `${failed} échec(s)` : 'Idempotence vérifiée.');
process.exit(failed ? 1 : 0);
