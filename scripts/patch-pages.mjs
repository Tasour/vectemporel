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
  .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/g, '')
  .replace(/<script>[\s\S]*?googletagmanager[\s\S]*?<\/script>/g, '');
import crypto from 'node:crypto';
const versionOf = (file) => crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(OUT, file))).digest('hex').slice(0, 10);
const mainAsset = (html.match(/src="\.\/(assets\/[^"]+\.js)"/) || [])[1] || '';
const version = mainAsset ? versionOf(mainAsset) : Date.now().toString(36);
html = html.replace(/src="\.\/(assets\/[^"]+\.(?:js|css))"/g, (match, asset) => `src="./${asset}?v=${version}"`);
html = html.replace(/href="\.\/(assets\/[^"]+\.css)"/g, (match, asset) => `href="./${asset}?v=${version}"`);
html = html.replace(/<script type="module"([^>]*)src="\.\/(assets\/[^"]+\.js)\?v=[^"]*"><\/script>/g,
  '<script>\n'
  + `  const start = () => { const s = document.createElement("script"); s.type = "module";`
  + ` s.src = "./$2?v=${version}"; document.head.appendChild(s); };\n`
  + `  const ready = navigator.serviceWorker?.register("./mirror-sw.js?v=${version}")\n`
  + `    .then((reg) => navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs\n`
  + `      .filter((other) => other !== reg && other.active?.scriptURL.includes("mirror-sw.js"))\n`
  + `      .map((other) => other.unregister()))).then(() => navigator.serviceWorker.ready)) ?? Promise.resolve();\n`
  + '  Promise.race([ready.catch(() => {}), new Promise((r) => setTimeout(r, 1500))]).then(start);\n'
  + '</script>');
html = html.replace(/[ \t]+$/gm, '');
fs.writeFileSync(indexPath, html);

for (const file of fs.readdirSync(path.join(OUT, 'assets'))) {
  if (!file.endsWith('.js')) continue;
  const target = path.join(OUT, 'assets', file);
  let body = fs.readFileSync(target, 'utf8');
  const before = body;
  body = body.replace(/(["'`])\/(styles|images|assets|fonts)\//g, '$1./$2/');
  body = body.replaceAll('__BUILD_VERSION__', version);
  if (body !== before) fs.writeFileSync(target, body);
}
const swPath = path.join(OUT, 'mirror-sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replaceAll('__BUILD_VERSION__', version));
console.log(`pages préparées : ${OUT}`);
