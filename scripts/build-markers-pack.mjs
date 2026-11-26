#!/usr/bin/env node
/* Construit le pack binaire des marqueurs : 68 473 fiches uniques + index
 * année → indices. Remplace les 4 001 requêtes `/markers?year=…`.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'api/v1/raw');
const OUT_DIR = path.join(ROOT, 'public/atlas-pack');
const OUT_GZ = path.join(OUT_DIR, 'markers-v1.bin.gz');
const OUT_MANIFEST = path.join(OUT_DIR, 'markers-manifest.json');
const OUT_VERSION = path.join(ROOT, 'src/features/atlasPack/markersPackVersion.ts');

function yearOf(file) {
  const match = /markers_year_(-?\d+)\.json$/.exec(file);
  return match ? Number(match[1]) : 0;
}

function readYears() {
  return fs.readdirSync(RAW)
    .filter((file) => /^markers_year_-?\d+\.json$/.test(file))
    .sort((a, b) => yearOf(a) - yearOf(b))
    .map((file) => ({
      year: yearOf(file),
      markers: JSON.parse(fs.readFileSync(path.join(RAW, file), 'utf8')),
    }));
}

function stringTable(values) {
  const head = Buffer.alloc(4);
  head.writeUInt32LE(values.length, 0);
  const chunks = [head];
  for (const value of values) {
    const bytes = Buffer.from(value, 'utf8');
    const len = Buffer.alloc(2);
    len.writeUInt16LE(bytes.length, 0);
    chunks.push(len, bytes);
  }
  return Buffer.concat(chunks);
}

function build() {
  const years = readYears();
  const ids = new Map();
  const idStrings = new Map();
  const idList = [];
  const names = new Map();
  const nameList = [];
  const types = new Map();
  const typeList = [];
  const records = [];

  const intern = (table, list, value) => {
    if (typeof value !== 'string' || value === '') return 0xffffffff;
    if (table.has(value)) return table.get(value);
    const index = list.length;
    table.set(value, index);
    list.push(value);
    return index;
  };

  const yearIndex = years.map(({ year, markers }) => {
    const indices = [];
    for (const marker of markers) {
      const id = marker._id;
      if (typeof id !== 'string' || id === '') continue;
      let index = ids.get(id);
      if (index === undefined) {
        index = records.length;
        ids.set(id, index);
        records.push({
          id: intern(idStrings, idList, id),
          name: intern(names, nameList, marker.name),
          lat: Number(marker.coo?.[1] ?? 0),
          lon: Number(marker.coo?.[0] ?? 0),
          c2lat: Number(marker.coo2?.[1] ?? 0),
          c2lon: Number(marker.coo2?.[0] ?? 0),
          hasCoo: Array.isArray(marker.coo),
          hasCoo2: Array.isArray(marker.coo2),
          year: Number(marker.year ?? 0),
          end: Number.isFinite(marker.end) ? marker.end : 0x7fff,
          type: intern(types, typeList, marker.type),
        });
      }
      indices.push(index);
    }
    return { year, indices };
  });

  const header = Buffer.alloc(4 + 2 + 2 + 2 + 2 + 4 + 4 + 4);
  let cursor = 0;
  header.write('VMP1', cursor); cursor += 4;
  header.writeUInt16LE(1, cursor); cursor += 2;
  header.writeInt16LE(years[0].year, cursor); cursor += 2;
  header.writeInt16LE(years.at(-1).year, cursor); cursor += 2;
  header.writeUInt16LE(years.length, cursor); cursor += 2;
  header.writeUInt32LE(records.length, cursor); cursor += 4;
  header.writeUInt32LE(idList.length, cursor); cursor += 4;
  header.writeUInt32LE(nameList.length, cursor); cursor += 4;

  const recordBuffers = records.map((record) => {
    const buf = Buffer.alloc(30);
    buf.writeUInt32LE(record.id, 0);
    buf.writeUInt32LE(record.name, 4);
    buf.writeFloatLE(record.lat, 8);
    buf.writeFloatLE(record.lon, 12);
    buf.writeFloatLE(record.c2lat, 16);
    buf.writeFloatLE(record.c2lon, 20);
    buf.writeInt16LE(record.year, 24);
    buf.writeInt16LE(record.end, 26);
    buf.writeUInt8(record.type === 0xffffffff ? 0xff : record.type, 28);
    buf.writeUInt8((record.hasCoo2 ? 1 : 0) | (record.hasCoo ? 2 : 0), 29);
    return buf;
  });

  // Index delta-variante : les indices triés sont stockés en écarts, ce qui
  // réduit fortement la taille compressée du pack.
  const indexParts = [];
  for (const { year, indices } of yearIndex) {
    const head = Buffer.alloc(6);
    head.writeInt16LE(year, 0);
    head.writeUInt32LE(indices.length, 2);
    const bytes = [];
    let previous = 0;
    for (const value of [...indices].sort((a, b) => a - b)) {
      let delta = (value - previous) >>> 0;
      previous = value;
      while (delta >= 0x80) {
        bytes.push((delta & 0x7f) | 0x80);
        delta >>>= 7;
      }
      bytes.push(delta);
    }
    indexParts.push(head, Buffer.from(bytes));
  }

  const binary = Buffer.concat([
    header,
    stringTable(idList),
    stringTable(nameList),
    stringTable(typeList),
    ...recordBuffers,
    ...indexParts,
  ]);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_GZ, zlib.gzipSync(binary, { level: 9 }));
  const hash = crypto.createHash('sha256').update(binary).digest('hex').slice(0, 12);
  fs.writeFileSync(OUT_MANIFEST, JSON.stringify({
    schema: 1,
    hash,
    bytes: binary.length,
    gzipBytes: fs.statSync(OUT_GZ).size,
    years: years.length,
    markers: records.length,
    ids: idList.length,
    names: nameList.length,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  fs.writeFileSync(OUT_VERSION, `/** Généré par scripts/build-markers-pack.mjs. */\nexport const MARKERS_PACK_VERSION = '${hash}';\n`);
  console.log(JSON.stringify({
    bytes: binary.length,
    gzipBytes: fs.statSync(OUT_GZ).size,
    years: years.length,
    markers: records.length,
  }, null, 2));
}

build();
