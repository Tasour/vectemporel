#!/usr/bin/env node
/* Construit le modèle binaire temporel des aires de jeu.
 *
 * Les fichiers `areas/*.gz` contiennent 99 % de données répétées d'une année à
 * l'autre. On stocke des dictionnaires, un keyframe tous les 100 ans et des
 * deltas annuels. Résultat mesuré : ~780 Ko compressés au lieu de 110 Mo.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AREAS_DIR = path.join(ROOT, 'api/v1/areas');
const OUT_DIR = path.join(ROOT, 'public/atlas-pack');
const OUT_BIN = path.join(OUT_DIR, 'atlas-v1.bin');
const OUT_GZ = path.join(OUT_DIR, 'atlas-v1.bin.gz');
const OUT_MANIFEST = path.join(OUT_DIR, 'manifest.json');
const OUT_VERSION = path.join(ROOT, 'src/features/atlasPack/packVersion.ts');
const KEYFRAME_INTERVAL = 100;
const DIMS = 4; // ruler, culture, religion, capital

function yearOf(file) {
  const match = /(-?\d+)\.gz$/.exec(file);
  return match ? Number(match[1]) : 0;
}

function readAreas() {
  const files = fs.readdirSync(AREAS_DIR)
    .filter((file) => file.endsWith('.gz'))
    .sort((a, b) => yearOf(a) - yearOf(b));
  return files.map((file) => ({
    year: yearOf(file),
    data: JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(AREAS_DIR, file))).toString('utf8')),
  }));
}

function build() {
  const years = readAreas();
  const provinceIndex = new Map();
  const provinceNames = [];
  const dicts = Array.from({ length: DIMS }, () => new Map([['', 0]]));

  const register = (value) => {
    if (typeof value !== 'string') return 0;
    return value;
  };

  for (const { data } of years) {
    for (const [name, entry] of Object.entries(data)) {
      if (!provinceIndex.has(name)) {
        provinceIndex.set(name, provinceNames.length);
        provinceNames.push(name);
      }
      for (let dim = 0; dim < DIMS; dim += 1) {
        const value = register(entry?.[dim]);
        if (value && !dicts[dim].has(value)) dicts[dim].set(value, dicts[dim].size);
      }
    }
  }

  const stringTable = (values) => {
    const chunks = [];
    const head = Buffer.alloc(2);
    head.writeUInt16LE(values.length, 0);
    chunks.push(head);
    for (const value of values) {
      const bytes = Buffer.from(value, 'utf8');
      const len = Buffer.alloc(2);
      len.writeUInt16LE(bytes.length, 0);
      chunks.push(len, bytes);
    }
    return Buffer.concat(chunks);
  };

  const dictBuffers = [
    stringTable(provinceNames),
    ...dicts.map((dict) => stringTable([...dict.keys()])),
  ];

  const streamParts = [];
  const keyframes = [];
  let streamLength = 0;
  let previous = null;

  const encodeRecord = (entry) => {
    const values = [];
    for (let dim = 0; dim < DIMS; dim += 1) {
      const value = entry?.[dim];
      values.push(typeof value === 'string' && value ? dicts[dim].get(value) ?? 0 : 0);
    }
    const population = Number(entry?.[4]);
    values.push(Number.isFinite(population) && population > 0 ? population : 0);
    return values;
  };

  for (const [index, { year, data }] of years.entries()) {
    const names = Object.keys(data);
    let forceKeyframe = index % KEYFRAME_INTERVAL === 0 || previous === null;
    const changes = [];

    if (!forceKeyframe) {
      for (const name of names) {
        const before = previous.get(name);
        const after = data[name];
        if (before === after) continue;
        const province = provinceIndex.get(name);
        const oldRec = before ? encodeRecord(before) : null;
        const newRec = encodeRecord(after);
        let mask = 0;
        for (let field = 0; field < 5; field += 1) {
          if (!oldRec || oldRec[field] !== newRec[field]) mask |= 1 << field;
        }
        if (mask) changes.push({ province, mask, rec: newRec });
      }
      for (const name of previous.keys()) {
        if (name in data) continue;
        changes.push({ province: provinceIndex.get(name), mask: 0x20, rec: null });
      }
    }

    if (!forceKeyframe && changes.length > 800) {
      // Un saut massif : un keyframe coûte moins cher qu'un delta géant.
      forceKeyframe = true;
    }

    if (forceKeyframe) {
      const header = Buffer.alloc(5);
      header.writeUInt8(1, 0);
      header.writeInt16LE(year, 1);
      header.writeUInt16LE(names.length, 3);
      const body = [];
      for (const name of names) {
        const rec = Buffer.alloc(14);
        rec.writeUInt16LE(provinceIndex.get(name), 0);
        const values = encodeRecord(data[name]);
        rec.writeUInt16LE(values[0], 2);
        rec.writeUInt16LE(values[1], 4);
        rec.writeUInt16LE(values[2], 6);
        rec.writeUInt16LE(values[3], 8);
        rec.writeUInt32LE(values[4], 10);
        body.push(rec);
      }
      const part = Buffer.concat([header, ...body]);
      keyframes.push({ year, offset: streamLength });
      streamParts.push(part);
      streamLength += part.length;
    } else {
      const header = Buffer.alloc(5);
      header.writeUInt8(2, 0);
      header.writeInt16LE(year, 1);
      header.writeUInt16LE(changes.length, 3);
      const body = [];
      for (const change of changes) {
        const base = Buffer.alloc(3);
        base.writeUInt16LE(change.province, 0);
        base.writeUInt8(change.mask, 2);
        const values = [];
        if (change.mask !== 0x20) {
          for (let field = 0; field < 5; field += 1) {
            if (!(change.mask & (1 << field))) continue;
            if (field === 4) {
              const value = Buffer.alloc(4);
              value.writeUInt32LE(change.rec[4], 0);
              values.push(value);
            } else {
              const value = Buffer.alloc(2);
              value.writeUInt16LE(change.rec[field], 0);
              values.push(value);
            }
          }
        }
        body.push(Buffer.concat([base, ...values]));
      }
      const part = Buffer.concat([header, ...body]);
      streamParts.push(part);
      streamLength += part.length;
    }
    previous = new Map(Object.entries(data));
  }

  const stream = Buffer.concat(streamParts);
  const keyframeTable = Buffer.alloc(2 + keyframes.length * 6);
  keyframeTable.writeUInt16LE(keyframes.length, 0);
  keyframes.forEach((frame, index) => {
    keyframeTable.writeInt16LE(frame.year, 2 + index * 6);
    keyframeTable.writeUInt32LE(frame.offset, 4 + index * 6);
  });

  const header = Buffer.alloc(4 + 2 + 2 + 2 + 2 + 2 + 2 + 2 * DIMS + 4 + 2);
  let cursor = 0;
  header.write('VAP1', cursor); cursor += 4;
  header.writeUInt16LE(1, cursor); cursor += 2;
  header.writeInt16LE(years[0].year, cursor); cursor += 2;
  header.writeInt16LE(years.at(-1).year, cursor); cursor += 2;
  header.writeUInt16LE(years.length, cursor); cursor += 2;
  header.writeUInt16LE(KEYFRAME_INTERVAL, cursor); cursor += 2;
  header.writeUInt16LE(provinceNames.length, cursor); cursor += 2;
  for (let dim = 0; dim < DIMS; dim += 1) {
    header.writeUInt16LE(dicts[dim].size, cursor); cursor += 2;
  }
  header.writeUInt32LE(stream.length, cursor); cursor += 4;
  header.writeUInt16LE(keyframes.length, cursor); cursor += 2;

  const binary = Buffer.concat([header, ...dictBuffers, keyframeTable, stream]);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_GZ, zlib.gzipSync(binary, { level: 9 }));
  // Le brut n'est pas déployé : seul le gzip est servi et versionné.
  fs.rmSync(OUT_BIN, { force: true });

  const hash = crypto.createHash('sha256').update(binary).digest('hex').slice(0, 12);
  fs.writeFileSync(OUT_MANIFEST, JSON.stringify({
    schema: 1,
    hash,
    bytes: binary.length,
    gzipBytes: fs.statSync(OUT_GZ).size,
    years: years.length,
    provinces: provinceNames.length,
    dictionaries: dicts.map((dict) => dict.size),
    keyframes: keyframes.length,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  fs.mkdirSync(path.dirname(OUT_VERSION), { recursive: true });
  fs.writeFileSync(OUT_VERSION, `/** Généré par scripts/build-atlas-pack.mjs. */\nexport const ATLAS_PACK_VERSION = '${hash}';\n`);

  console.log(JSON.stringify({
    binaryBytes: binary.length,
    gzipBytes: fs.statSync(OUT_GZ).size,
    years: years.length,
    provinces: provinceNames.length,
    keyframes: keyframes.length,
  }, null, 2));
}

build();
