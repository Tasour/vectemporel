#!/usr/bin/env node
/* Construit le bundle Three.js local, tree-shaké, à partir des exports utilisés.
 * Sortie déterministe, aucun réseau runtime, licence MIT conservée. */
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'public/three-bundle.js');

await build({
  entryPoints: [path.join(ROOT, 'scripts/three-entry.js')],
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
console.log(`three-bundle.js : ${(bytes / 1024).toFixed(0)} Ko brut, ${(gzip / 1024).toFixed(0)} Ko gzip`);
