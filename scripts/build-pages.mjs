#!/usr/bin/env node
/* Génère le site statique GitHub Pages (branche gh-pages) depuis l'atlas.
 * Un cache-busting déterministe est appliqué à chaque build : le numéro de
 * cache du service worker et les URLs des assets dépendent du hash du contenu. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'dist-pages');
const FILES = ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js'];
const DIRS = ['public', 'src', 'icons'];
const CACHE_SOURCE = 'vectemporel-v7';

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

/* Hash déterministe de tous les fichiers copiés, triés par chemin. */
const digest = crypto.createHash('sha256');
function walk(dir, prefix) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = `${prefix}${entry.name}`;
    if (entry.isDirectory()) walk(full, `${rel}/`);
    else if (entry.isFile()) {
      digest.update(rel);
      digest.update(fs.readFileSync(full));
    }
  }
}
for (const file of FILES) {
  digest.update(file);
  digest.update(fs.readFileSync(path.join(OUT, file)));
}
for (const dir of DIRS) walk(path.join(OUT, dir), `${dir}/`);
const version = digest.digest('hex').slice(0, 12);
const cacheName = `vectemporel-${version}`;

/* Le SW publié porte un nom de cache unique par version de contenu. */
const swPath = path.join(OUT, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');
if (!sw.includes(CACHE_SOURCE)) throw new Error(`Version de cache source introuvable : ${CACHE_SOURCE}`);
fs.writeFileSync(swPath, sw.replace(CACHE_SOURCE, cacheName));

/* Les URLs statiques portent aussi la version : aucun asset périmé dans le cache HTTP. */
const indexPath = path.join(OUT, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
for (const asset of [
  './manifest.webmanifest', './icons/icon-192.png', './styles.css',
  './public/three.min.js', './src/app.js',
]) {
  const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  html = html.replace(new RegExp(`(["'])${escaped}(["'])`, 'g'), `$1${asset}?v=${version}$2`);
}
fs.writeFileSync(indexPath, html);

const builtSw = fs.readFileSync(swPath, 'utf8');
const builtHtml = fs.readFileSync(indexPath, 'utf8');
if (!builtSw.includes(`const CACHE = '${cacheName}'`)) throw new Error('Cache non versionné dans le SW publié');
if (!builtHtml.includes(`?v=${version}`)) throw new Error('Assets non versionnés dans index.html');

fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'build-version.txt'), `${version}\n`);

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
  const full = path.join(dir, entry.name);
  return sum + (entry.isDirectory() ? count(full) : 1);
}, 0);
console.log(`dist-pages généré : ${FILES.length + DIRS.length} entrées, ${count(OUT)} fichiers, version ${version}`);
