#!/usr/bin/env node
/* Construit public/d3-bundle.js depuis le vendor D3 local (ISC).
 * Sortie déterministe, aucun réseau runtime, licence conservée. */
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'public/d3-bundle.js');

await build({
  entryPoints: [path.join(ROOT, 'scripts/d3-entry.js')],
  outfile: OUT,
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2020'],
  legalComments: 'inline',
  sourcemap: false,
  logLevel: 'warning',
});

const bytes = fs.statSync(OUT).size;
const gzip = zlib.gzipSync(fs.readFileSync(OUT), { level: 9 }).length;
console.log(`d3-bundle.js : ${(bytes / 1024).toFixed(0)} Ko brut, ${(gzip / 1024).toFixed(0)} Ko gzip`);
