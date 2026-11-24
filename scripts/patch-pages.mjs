#!/usr/bin/env node
/* Prépare le build Vite pour GitHub Pages : chemins relatifs, enregistrement du
 * service worker miroir avant le chargement de l'application. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'dist');
const OUT = process.argv[2] || path.join(ROOT, 'dist-pages');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(SRC, OUT, { recursive: true });

const indexPath = path.join(OUT, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/(src|href)="\//g, '$1="./');
html = html.replace('<base href="./" />', '');
html = html.replace(/<link rel="preconnect"[^>]*googleapis[^>]*>/g, '')
  .replace(/<link rel="preconnect"[^>]*gstatic[^>]*>/g, '')
  .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/g, '');
html = html.replace(/<script type="module"([^>]*)src="\.\/(assets\/[^"]+\.js)"><\/script>/g,
  '<script>\n'
  + '  navigator.serviceWorker.register("./mirror-sw.js").then(() => navigator.serviceWorker.ready).then(() => {\n'
  + '    const script = document.createElement("script"); script.type = "module";'
  + ' script.src = "./$2"; document.head.appendChild(script);\n'
  + '  }).catch(() => { const s = document.createElement("script"); s.type = "module";'
  + ' s.src = "./$2"; document.head.appendChild(s); });\n'
  + '</script>');
fs.writeFileSync(indexPath, html);

for (const file of fs.readdirSync(path.join(OUT, 'assets'))) {
  if (!file.endsWith('.js')) continue;
  const target = path.join(OUT, 'assets', file);
  let body = fs.readFileSync(target, 'utf8');
  const before = body;
  body = body.replace(/"\/styles\//g, '"./styles/').replace(/"\/images\//g, '"./images/');
  body = body.replace(/"\/assets\//g, '"./assets/');
  if (body !== before) fs.writeFileSync(target, body);
}
console.log(`pages préparées : ${OUT}`);
