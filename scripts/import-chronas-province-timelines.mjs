#!/usr/bin/env node
/* Import build-time des timelines de provinces Chronas, reprenable.
 * Zéro réseau au runtime. Données © Chronas CC BY-SA 4.0. */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './lib/atomic.mjs';
import { CHRONAS_MAP } from '../src/data/chronas-map.js';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const API = process.env.CHRONAS_API || 'https://api.chronas.org';
const RAW = process.env.CHRONAS_RAW || '/tmp/opencode/chronas-province-timelines.ndjson';
const CHECKPOINT = process.env.CHRONAS_CHECKPOINT || '/tmp/opencode/chronas-province-timelines-checkpoint.json';
const OUT = path.join(ROOT, 'src/data/province-timelines');
const CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.CHRONAS_CONCURRENCY || 6)));
const TIMEOUT = 20000;
const MAX_BYTES = 500_000;
const MAX_RETRIES = 3;
const MAX_CHUNK = 220_000;
const DIMENSIONS = ['capital', 'ruler', 'religionGeneral', 'culture', 'religion', 'population'];
if (new URL(API).hostname !== 'api.chronas.org') throw new Error('Hôte non autorisé');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const jitter = (attempt) => Math.floor(Math.random() * 300 * 2 ** attempt);
const names = Object.keys(CHRONAS_MAP.areas).sort((a, b) => a.localeCompare(b, 'fr'));

async function fetchTimeline(name) {
  const id = encodeURIComponent(`ap_${name.toLowerCase()}`);
  const url = `${API}/v1/metadata/${id}?type=ap`;
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), redirect: 'error' });
      if (response.status === 429 || response.status === 503) throw new Error(`HTTP ${response.status}`);
      if (response.status === 404) return { n: name, d: {} };
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_BYTES) throw new Error('Réponse trop volumineuse');
      const json = JSON.parse(new TextDecoder().decode(buffer));
      return { n: name, d: json.data || {} };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) await sleep(jitter(attempt) + 200 * attempt);
    }
  }
  throw new Error(`${name}: ${lastError?.message}`);
}

function loadCheckpoint() {
  try {
    const data = JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'));
    return new Set((data.done || []).filter((name) => names.includes(name)));
  } catch {
    return new Set();
  }
}

let writeQueue = Promise.resolve();
function appendRaw(line) {
  writeQueue = writeQueue.then(() => fs.promises.appendFile(RAW, `${line}\n`, 'utf8'));
  return writeQueue;
}

async function collect() {
  fs.mkdirSync(path.dirname(RAW), { recursive: true });
  if (!fs.existsSync(RAW)) fs.writeFileSync(RAW, '', 'utf8');
  const done = loadCheckpoint();
  const pending = names.filter((name) => !done.has(name));
  console.log(`${done.size}/${names.length} déjà récupérées, ${pending.length} restantes`);
  let cursor = 0;
  let completed = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < pending.length) {
      const name = pending[cursor++];
      const record = await fetchTimeline(name);
      await appendRaw(JSON.stringify(record));
      done.add(name);
      completed += 1;
      if (completed % 100 === 0 || done.size === names.length) {
        await writeFileAtomic(CHECKPOINT, `${JSON.stringify({ done: [...done].sort((a, b) => a.localeCompare(b, 'fr')) })}\n`);
        console.log(`${done.size}/${names.length}`);
      }
    }
  });
  await Promise.all(workers);
  await writeQueue;
  await writeFileAtomic(CHECKPOINT, `${JSON.stringify({ done: [...done].sort((a, b) => a.localeCompare(b, 'fr')) })}\n`);
}

function compact(record) {
  const out = {};
  for (const dimension of DIMENSIONS) {
    const entries = [];
    for (const row of record.d?.[dimension] || []) {
      for (const [year, value] of Object.entries(row || {})) {
        const y = Number(year);
        const text = String(value || '').trim();
        if (Number.isFinite(y) && text) entries.push([y, text]);
      }
    }
    entries.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1], 'fr'));
    out[dimension] = entries.filter((entry, index) => index === 0 || entry[1] !== entries[index - 1][1]);
  }
  return out;
}

async function generate() {
  fs.mkdirSync(OUT, { recursive: true });
  const records = new Map();
  const stream = readline.createInterface({ input: fs.createReadStream(RAW, 'utf8'), crlfDelay: Infinity });
  for await (const line of stream) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    if (names.includes(record.n)) records.set(record.n, compact(record));
  }
  if (records.size !== names.length) {
    throw new Error(`${records.size}/${names.length} timelines présentes dans le brut — import incomplet`);
  }

  const index = {};
  const buckets = new Map();
  for (const name of names) {
    const letter = (/^[a-z]$/i.test(name[0] || '') ? name[0].toLowerCase() : '0');
    if (!buckets.has(letter)) buckets.set(letter, []);
    buckets.get(letter).push(name);
  }

  const files = new Map();
  for (const [letter, group] of buckets) {
    let part = 1;
    let current = [];
    let size = 0;
    const flush = () => {
      if (!current.length) return;
      const filename = part === 1 ? `${letter}.js` : `${letter}${part}.js`;
      const payload = Object.fromEntries(current.map((name) => [name, records.get(name)]));
      const content = `/* Généré par import-chronas-province-timelines.mjs — CC BY-SA 4.0. */\nexport const PROVINCE_TIMELINES = ${JSON.stringify(payload)};\n`;
      writeFileAtomic(path.join(OUT, filename), content);
      for (const name of current) index[name] = filename;
      files.set(filename, content.length);
      part += 1;
      current = [];
      size = 0;
    };
    for (const name of group) {
      const record = records.get(name);
      const bytes = JSON.stringify(record).length + name.length + 8;
      if (size + bytes > MAX_CHUNK) flush();
      current.push(name);
      size += bytes;
    }
    flush();
  }

  const indexContent = `/* Généré par import-chronas-province-timelines.mjs — CC BY-SA 4.0. */\nexport const PROVINCE_CHUNKS = ${JSON.stringify(index)};\n`;
  writeFileAtomic(path.join(OUT, 'index.js'), indexContent);
  const total = [...files.values()].reduce((sum, value) => sum + value, 0);
  console.log(`${names.length} timelines, ${files.size} chunks, ${(total / 1024).toFixed(0)} Ko + index ${(indexContent.length / 1024).toFixed(0)} Ko`);
}

await collect();
await generate();
