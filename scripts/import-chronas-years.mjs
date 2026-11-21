#!/usr/bin/env node
/* Import build-time des 4 001 années Chronas (-2000..2000), reprenable.
 * Zéro réseau au runtime : les chunks générés sont locaux. Aucun code du
 * frontend Chronas n'est copié. Données © Chronas CC BY-SA 4.0. */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './lib/atomic.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const API = process.env.CHRONAS_API || 'https://api.chronas.org';
const RAW = process.env.CHRONAS_RAW || '/tmp/opencode/chronas-years.ndjson';
const CHECKPOINT = process.env.CHRONAS_CHECKPOINT || '/tmp/opencode/chronas-years-checkpoint.json';
const CHUNKS = path.join(ROOT, 'src/data/years');
const SNAPSHOT = path.join(ROOT, 'src/data/chronas-map.js');
const MIN = -2000;
const MAX = 2000;
const CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.CHRONAS_CONCURRENCY || 6)));
const TIMEOUT = 20000;
const MAX_BYTES = 2_000_000;
const MAX_RETRIES = 3;
if (new URL(API).hostname !== 'api.chronas.org') throw new Error('Hôte non autorisé');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const jitter = (attempt) => Math.floor(Math.random() * 300 * 2 ** attempt);

async function fetchYear(year) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${API}/v1/areas/${year}`, {
        signal: AbortSignal.timeout(TIMEOUT), redirect: 'error',
      });
      if (response.status === 429 || response.status === 503) throw new Error(`HTTP ${response.status}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_BYTES) throw new Error(`Réponse trop volumineuse (${buffer.byteLength})`);
      return JSON.parse(new TextDecoder().decode(buffer));
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) await sleep(jitter(attempt) + 200 * attempt);
    }
  }
  throw new Error(`Année ${year} échouée : ${lastError?.message}`);
}

function loadCheckpoint() {
  try {
    const data = JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'));
    return new Set((data.done || []).filter((year) => Number.isInteger(year) && year >= MIN && year <= MAX));
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
  const pending = [];
  for (let year = MIN; year <= MAX; year += 1) if (!done.has(year)) pending.push(year);
  console.log(`${done.size} années déjà récupérées, ${pending.length} restantes`);

  let cursor = 0;
  let completed = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < pending.length) {
      const year = pending[cursor++];
      try {
        const areas = await fetchYear(year);
        await appendRaw(JSON.stringify({ y: year, a: areas }));
        done.add(year);
        completed += 1;
        if (completed % 100 === 0 || done.size === MAX - MIN + 1) {
          await writeFileAtomic(CHECKPOINT, `${JSON.stringify({ done: [...done].sort((a, b) => a - b) })}\n`);
          console.log(`${done.size}/${MAX - MIN + 1} années — checkpoint écrit`);
        }
      } catch (error) {
        console.error(`ÉCHEC ${year}: ${error.message}`);
        throw error;
      }
    }
  });
  await Promise.all(workers);
  await writeQueue;
  await writeFileAtomic(CHECKPOINT, `${JSON.stringify({ done: [...done].sort((a, b) => a - b) })}\n`);
  return done;
}

function rowFrom(value) {
  if (!Array.isArray(value)) return null;
  return value.slice(0, 5).map((item, index) => (index === 4 ? Number(item) || 0 : String(item ?? '')));
}

async function generate() {
  fs.mkdirSync(CHUNKS, { recursive: true });
  const previous = await import(path.join(ROOT, 'src/data/chronas-map.js')).then((m) => m.CHRONAS_MAP);
  // Les workers écrivent en parallèle : le fichier brut n'est pas trié.
  // On lit tout, on déduplique par année, puis on traite dans l'ordre.
  const records = new Map();
  const stream = readline.createInterface({ input: fs.createReadStream(RAW, 'utf8'), crlfDelay: Infinity });
  for await (const line of stream) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    if (Number.isInteger(record.y) && record.y >= MIN && record.y <= MAX && record.a) {
      records.set(record.y, record.a);
    }
  }
  if (records.size !== MAX - MIN + 1) {
    throw new Error(`${records.size}/${MAX - MIN + 1} années présentes dans le brut — import incomplet`);
  }

  let centuryStart = MIN;
  let centuryBase = null;
  let baseSnapshot = null;
  let current = null;
  let currentYear = MIN;
  const deltas = {};
  let written = 0;

  const closeCentury = async () => {
    if (!centuryBase) return;
    const file = path.join(CHUNKS, `c${centuryStart}.json`);
    await writeFileAtomic(file, `${JSON.stringify({ start: centuryStart, base: centuryBase, deltas })}\n`);
    written += 1;
  };

  for (let year = MIN; year <= MAX; year += 1) {
    const rows = records.get(year);
    if (year === MIN) baseSnapshot = rows;
    if (year === centuryStart) centuryBase = rows;
    if (year > centuryStart) {
      const diff = [];
      for (const [name, value] of Object.entries(rows)) {
        const next = rowFrom(value);
        const before = current ? current[name] : null;
        const beforeKey = JSON.stringify(before);
        if (beforeKey !== JSON.stringify(next)) diff.push([name, next]);
      }
      if (current) {
        for (const name of Object.keys(current)) {
          if (!(name in rows)) diff.push([name, null]);
        }
      }
      deltas[year] = diff;
    }
    current = rows;
    currentYear = year;
    if ((year - MIN + 1) % 100 === 0 || year === MAX) {
      await closeCentury();
      centuryStart = year === MAX ? MAX + 100 : year + 1;
      centuryBase = null;
      Object.keys(deltas).forEach((key) => delete deltas[key]);
    }
  }
  if (Object.keys(deltas).length) await closeCentury();
  console.log(`${written} chunks générés (dernier: ${currentYear})`);

  const base = baseSnapshot || current;
  const snapshot = {
    meta: {
      ...previous.meta,
      year: 1000,
      minYear: MIN,
      maxYear: MAX,
      baseYear: MIN,
      referenceYear: 1000,
      areas: Object.keys(previous.areas || {}).length,
      features: previous.features.length,
    },
    areas: previous.areas,
    base,
    features: previous.features,
  };
  const content = `/* Généré par scripts/import-chronas-years.mjs — NE PAS ÉDITER.\n * Données © Chronas, CC BY-SA 4.0. Voir DATA-LICENSE.md et ATTRIBUTION.md. */\nexport const CHRONAS_MAP = ${JSON.stringify(snapshot)};\n`;
  writeFileAtomic(SNAPSHOT, content);
  console.log(`Snapshot écrit : ${(content.length / 1024).toFixed(0)} Ko`);
}

await collect();
await generate();
