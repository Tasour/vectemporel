#!/usr/bin/env node
/* Génère le site statique GitHub Pages (branche gh-pages) depuis l'atlas.
 * Uniquement les fichiers nécessaires à l'exécution : audits, scripts, tests,
 * node_modules et documentation restent hors du site publié. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'dist-pages');
const FILES = ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js'];
const DIRS = ['public', 'src', 'icons'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const file of FILES) {
  const source = path.join(ROOT, file);
  if (!fs.existsSync(source)) throw new Error(`Fichier absent : ${file}`);
  fs.copyFileSync(source, path.join(OUT, file));
}
for (const dir of DIRS) {
  const source = path.join(ROOT, dir);
  if (!fs.existsSync(source)) throw new Error(`Dossier absent : ${dir}`);
  fs.cpSync(source, path.join(OUT, dir), { recursive: true });
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
  const full = path.join(dir, entry.name);
  return sum + (entry.isDirectory() ? count(full) : 1);
}, 0);
console.log(`dist-pages généré : ${FILES.length + DIRS.length} entrées, ${count(OUT)} fichiers`);
