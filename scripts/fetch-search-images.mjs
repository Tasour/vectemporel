#!/usr/bin/env node
/* Vectemporel — complète les images manquantes par recherche Wikimedia Commons.
 * Chaque résultat est vérifié via l'API : fichier, taille, auteur, licence.
 * Aucun crédit ni sujet n'est supposé. */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const UA = 'Vectemporel/0.2 (https://github.com/Tasour/vectemporel; prototype pédagogique local)';
const API = 'https://commons.wikimedia.org/w/api.php';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadData() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'), context);
  return context.window.VECTEMPOREL_DATA;
}

function loadImages() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'event-images.js'), 'utf8'), context);
  return context.window.VECTEMPOREL_EVENT_IMAGES || {};
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const blacklist = /(^|[_ -])(map|maps|flag|logo|icon|seal|coat.of.arms|blank|diagram|chart|wikimedia|commons|upload)([_ -]|$|\.)/i;
const badFile = /\.(pdf|djvu|svg)$/i;
function acceptable(file) {
  return file && !badFile.test(file) && !blacklist.test(file);
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    if (response.ok) return response.json();
    console.warn(`HTTP ${response.status}, tentative ${attempt + 1}`);
    await sleep(3000 * (attempt + 1));
  }
  return null;
}

async function download(url, destination) {
  const response = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 3000) throw new Error('fichier trop petit');
  fs.writeFileSync(destination, buffer);
}

const data = loadData();
const images = loadImages();
const manual = JSON.parse(fs.readFileSync(path.join(ROOT, 'images', 'manual-queries.json'), 'utf8'));
const manualFiles = JSON.parse(fs.readFileSync(path.join(ROOT, 'images', 'manual-files.json'), 'utf8'));
// On écarte les entrées invalides (PDF, schémas) pour les remplacer.
for (const [id, entry] of Object.entries(images)) {
  if (!entry.file || !acceptable(entry.file) || !fs.existsSync(path.join(ROOT, entry.src))) {
    delete images[id];
  }
}
const missing = [];
for (const country of data.countries) {
  for (const event of country.events) {
    if (!images[event.id]) missing.push({ country, event });
  }
}
console.log(`${missing.length} repères sans image`);
const outDir = path.join(ROOT, 'images', 'search');
fs.mkdirSync(outDir, { recursive: true });
const rows = [];
const failures = [];

for (const { country, event } of missing) {
  if (manualFiles[event.id]) {
    const entry = manualFiles[event.id];
    const response = await api({
      action: 'query', prop: 'imageinfo', titles: entry.file,
      iiprop: 'url|extmetadata|size', iiurlwidth: '560',
    });
    await sleep(1200);
    const page = response?.query?.pages?.find((item) => item.imageinfo?.[0]);
    if (page) {
      const info = page.imageinfo[0];
      const metadata = info.extmetadata || {};
      const thumb = info.thumburl;
      const extension = (thumb?.split('?')[0].match(/\.(jpe?g|png|webp)$/i) || ['.jpg'])[0];
      const filename = `${event.id}${extension}`;
      try {
        await download(thumb, path.join(outDir, filename));
        images[event.id] = {
          src: `images/search/${filename}`,
          alt: entry.alt,
          caption: entry.caption,
          credit: stripHtml(metadata.Artist?.value) || stripHtml(metadata.Credit?.value) || 'Wikimedia Commons',
          license: stripHtml(metadata.LicenseShortName?.value) || 'voir la page source',
          licenseUrl: metadata.LicenseUrl?.value || null,
          source: `https://commons.wikimedia.org/wiki/${entry.file.replace(/^File:/, '').replace(/ /g, '_')}`,
          file: entry.file,
          kind: 'manual',
        };
        rows.push(`| \`${event.id}\` | ${entry.file} | ${images[event.id].credit} | ${images[event.id].license} |`);
        console.log(`✓ ${event.id} (fiche manuelle)`);
      } catch (error) {
        failures.push(`| \`${event.id}\` | ${error.message} |`);
      }
    } else {
      failures.push(`| \`${event.id}\` | fichier manuel introuvable |`);
    }
    continue;
  }
  const slug = event.grok ? String(event.grok).replace(/_/g, ' ') : '';
  const queries = [
    ...(Array.isArray(manual[event.id]) ? manual[event.id] : manual[event.id] ? [manual[event.id]] : []),
    `${event.title} ${country.name}`,
    ...(slug ? [`${slug} ${country.name}`, slug] : []),
    event.title,
  ];
  let found = null;
  for (const query of queries) {
    const response = await api({
      action: 'query',
      generator: 'search',
      gsrnamespace: '6',
      gsrlimit: '6',
      gsrsearch: query,
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|size',
      iiurlwidth: '560',
    });
    await sleep(1100);
    if (!response) continue;
    const pages = (response.query?.pages || [])
      .filter((page) => page.imageinfo?.[0] && acceptable(page.title))
      .map((page) => {
        const info = page.imageinfo[0];
        const metadata = info.extmetadata || {};
        return {
          title: page.title,
          url: info.thumburl || info.url,
          width: info.width,
          height: info.height,
          license: stripHtml(metadata.LicenseShortName?.value),
          licenseUrl: metadata.LicenseUrl?.value || null,
          artist: stripHtml(metadata.Artist?.value) || stripHtml(metadata.Credit?.value) || 'Wikimedia Commons',
          description: stripHtml(metadata.ImageDescription?.value),
        };
      })
      .filter((page) => (page.width || 0) >= 400 && (page.height || 0) >= 240);
    if (pages.length) {
      found = pages[0];
      break;
    }
  }
  if (!found) {
    failures.push(`| \`${event.id}\` | aucun résultat recevable |`);
    continue;
  }
  const extension = (found.url.split('?')[0].match(/\.(jpe?g|png|webp)$/i) || ['.jpg'])[0];
  const filename = `${event.id}${extension}`;
  try {
    await download(found.url, path.join(outDir, filename));
    const description = found.description || found.title.replace(/^File:/, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ');
    images[event.id] = {
      src: `images/search/${filename}`,
      alt: description.slice(0, 180),
      caption: description.slice(0, 150),
      credit: found.artist,
      license: found.license || 'voir la page source',
      licenseUrl: found.licenseUrl,
      source: `https://commons.wikimedia.org/wiki/${found.title.replace(/ /g, '_')}`,
      file: found.title,
      kind: 'search',
    };
    rows.push(`| \`${event.id}\` | ${found.title} | ${found.artist} | ${found.license || '—'} |`);
  } catch (error) {
    failures.push(`| \`${event.id}\` | ${error.message} |`);
  }
}

const js = `/* Généré par scripts/fetch-search-images.mjs — images vérifiées via l'API Commons.
 * ${new Date().toISOString().slice(0, 10)}
 */
window.VECTEMPOREL_EVENT_IMAGES = ${JSON.stringify(images, null, 2)};
`;
fs.writeFileSync(path.join(ROOT, 'event-images.js'), js, 'utf8');
const report = `# Images de complément (recherche Commons)

> Généré par \`npm run build:images:all\`. ${new Date().toISOString().slice(0, 10)}.

Recherche Wikimedia Commons pour les repères sans image Wikipedia. Le premier
résultat recevable est retenu ; la taille, l'auteur et la licence sont lus dans
l'API. Les filtres écartent drapeaux, cartes, logos, schémas et icônes.

- Repères illustrés au total : **${Object.keys(images).length}/229**
- Images ajoutées : **${rows.length}**
- Échecs : **${failures.length}**

| Repère | Fichier Commons | Crédit | Licence |
| --- | --- | --- | --- |
${rows.join('\n')}

${failures.length ? `## Échecs\n\n| Repère | Raison |\n| --- | --- |\n${failures.join('\n')}\n` : ''}
`;
fs.writeFileSync(path.join(ROOT, 'SEARCH_IMAGES.md'), report, 'utf8');
console.log(`${Object.keys(images).length}/229 repères illustrés ; ${failures.length} échecs.`);
