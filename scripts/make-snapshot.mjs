#!/usr/bin/env node
/* Snapshot déterministe des données générées : un hash pour tout l'ensemble. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const FILES = [
  'src/data/chronas-epics.js',
  'src/data/trails.js',
  'src/data/turning-points.js',
  'src/data/anomalies.js',
  'src/data/histomap.json',
  'src/data/data-quality.js',
  'scripts/families.csv',
];
const digest = crypto.createHash('sha256');
for (const file of FILES) {
  const bytes = fs.readFileSync(path.join(ROOT, file));
  digest.update(file);
  digest.update(bytes);
}
const hash = digest.digest('hex');
fs.writeFileSync(path.join(ROOT, 'data-snapshot.sha256'), `${hash}  ${FILES.join(' ')}\n`);
console.log(`data-snapshot.sha256 : ${hash}`);
