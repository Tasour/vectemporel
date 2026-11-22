#!/usr/bin/env node
/* Le snapshot doit correspondre exactement aux données générées présentes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SNAPSHOT = path.join(ROOT, 'data-snapshot.sha256');
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const line = fs.readFileSync(SNAPSHOT, 'utf8').trim();
const [expected, ...files] = line.split(/\s+/);
const digest = crypto.createHash('sha256');
for (const file of files) {
  digest.update(file);
  digest.update(fs.readFileSync(path.join(ROOT, file)));
}
const actual = digest.digest('hex');
check('snapshot correspond aux données', actual === expected, `${expected.slice(0, 12)} vs ${actual.slice(0, 12)}`);

const before = fs.readFileSync(SNAPSHOT);
execFileSync(process.execPath, ['scripts/make-snapshot.mjs'], { cwd: ROOT, stdio: 'pipe' });
check('snapshot reproductible', before.equals(fs.readFileSync(SNAPSHOT)));

console.log(failed ? `${failed} échec(s)` : 'Snapshot OK.');
process.exit(failed ? 1 : 0);
