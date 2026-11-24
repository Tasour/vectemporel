#!/usr/bin/env node
/* Miroir local complet de l'API Chronas : extraction déterministe et reprise.
 * Zéro invention : chaque fichier est une réponse réelle de l'API amont. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://d24mkpax7rmotx.cloudfront.net/v1';
const OUT = path.join(ROOT, 'api/v1');
const CONCURRENCY = 8;
const RETRIES = 3;
const UA = { 'User-Agent': 'VectemporelApiMirror/1.0 (local offline mirror)' };

const tasks = [];
const keyOf = (name) => name.replace(/[^a-zA-Z0-9_-]+/g, '_');
for (let year = -2000; year <= 2000; year += 1) {
  tasks.push({ name: `areas/${year}`, url: `/areas/${year}`, gzip: true });
}
for (const query of [
  'markers?year=1000', 'markers?year=1500', 'markers?year=0', 'markers?year=-500',
  'markers?year=1800', 'markers?year=1900', 'markers?year=2000', 'markers?year=-3000',
  'markers?types=c&year=-5000&end=2100&limit=10000',
  'markers?year=1500&type=battle', 'markers?year=1800&type=capital',
  'markers?year=1900&type=capital', 'markers?year=1000&limit=10000',
  'metadata?type=g&f=provinces,ruler,culture,religion,capital,province,religionGeneral',
  'metadata?type=g&locale=fr&f=ruler_fr,culture_fr,religion_fr,religionGeneral_fr',
  'metadata?type=e&end=3000&subtype=ew,ei,ps',
  'metadata?type=e&end=3000&subtype=ew',
  'metadata?type=e&end=3000&subtype=ei',
  'metadata?type=e&end=3000&subtype=ps',
  'metadata',
  'health',
]) {
  tasks.push({ name: `raw/${keyOf(query)}`, url: `/${query}`, gzip: false });
}

fs.mkdirSync(OUT, { recursive: true });
const manifest = [];
const failures = [];
let index = 0;
let done = 0;

async function run(task) {
  const target = path.join(OUT, task.gzip ? `${task.name}.gz` : `${task.name}.json`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) return;
  let lastError = null;
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${BASE}${task.url}`, { headers: UA, signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = Buffer.from(await response.arrayBuffer());
      const hash = crypto.createHash('sha256').update(body).digest('hex');
      fs.writeFileSync(target, task.gzip ? zlib.gzipSync(body, { level: 9 }) : body);
      manifest.push({ name: task.name, url: task.url, bytes: body.length, sha256: hash });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  failures.push({ name: task.name, url: task.url, error: String(lastError) });
}

async function worker() {
  while (index < tasks.length) {
    const task = tasks[index++];
    await run(task);
    done += 1;
    if (done % 100 === 0) console.log(`${done}/${tasks.length}`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
const report = { date: new Date().toISOString().slice(0, 10), source: BASE, count: manifest.length,
  failures, manifest };
fs.writeFileSync(path.join(ROOT, 'api/MANIFEST.json'), JSON.stringify(report, null, 2));
console.log(`extract: ${manifest.length}/${tasks.length}, échecs ${failures.length}`);
if (failures.length) { console.error(failures.slice(0, 10)); process.exit(1); }
