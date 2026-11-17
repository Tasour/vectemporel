#!/usr/bin/env node
/*
 * Vectemporel — trouve une image documentaire pour chaque repère.
 *
 * Méthode (toutes les données sont vérifiées via les API, rien n'est supposé) :
 *   1. pageimages sur fr.wikipedia et en.wikipedia pour le slug Grokipedia
 *      et le titre français de chaque repère ;
 *   2. imageinfo sur Wikimedia Commons pour l'auteur, la licence et la vignette ;
 *   3. téléchargement local + écriture de event-images.js ;
 *   4. les 10 entrées curatées de images/event-images.curation.json gardent
 *      la priorité sur les images automatiquement trouvées.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const UA = 'Vectemporel/0.2 (https://github.com/Tasour/vectemporel; prototype pédagogique local)';
const SITES = {
  fr: 'https://fr.wikipedia.org/w/api.php',
  en: 'https://en.wikipedia.org/w/api.php',
  commons: 'https://commons.wikimedia.org/w/api.php',
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chunk = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
  return result;
};

function loadData() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'), context);
  return context.window.VECTEMPOREL_DATA;
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

function key(title) {
  return String(title).replace(/^File:/, '').replace(/_/g, ' ').toLowerCase().trim();
}

async function api(site, params) {
  const url = `${SITES[site]}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    if (response.ok) return response.json();
    const body = (await response.text()).slice(0, 180).replace(/\s+/g, ' ');
    console.warn(`API ${site} HTTP ${response.status} (tentative ${attempt + 1}) : ${body}`);
    await sleep(3000 * (attempt + 1));
  }
  throw new Error(`API ${site} indisponible`);
}

function resolver(data) {
  const maps = [
    ...(data.query?.normalized || []),
    ...(data.query?.redirects || []),
  ].map((item) => [key(item.from), key(item.to)]);
  return (title) => {
    let result = key(title);
    for (let i = 0; i < 6; i += 1) {
      const found = maps.find(([from]) => from === result);
      if (!found) break;
      result = found[1];
    }
    return result;
  };
}

const blacklist = /(^|_)(map|maps|flag|logo|icon|seal|coat.of.arms|location|blank|diagram|chart|plaque|sign|street|route|wikimedia|commons)(_|$|\.)/i;

function acceptable(fileName) {
  if (!fileName) return false;
  if (/\.svg$/i.test(fileName)) return false;
  if (blacklist.test(fileName)) return false;
  return true;
}

const data = loadData();
const events = data.countries.flatMap((country) => country.events.map((event) => ({ country, event })));
const candidates = new Map();
for (const { event } of events) {
  const slug = event.grok ? String(event.grok).replace(/_/g, ' ') : '';
  candidates.set(event.id, [
    { lang: 'en', title: slug },
    { lang: 'fr', title: event.title },
    { lang: 'fr', title: slug },
    { lang: 'en', title: event.title },
  ].filter((item) => item.title));
}

const pages = { fr: new Map(), en: new Map() };
for (const lang of ['en', 'fr']) {
  const titles = [...new Set([...candidates.values()].flat().filter((item) => item.lang === lang).map((item) => item.title))];
  console.log(`${lang} : ${titles.length} titres à interroger`);
  for (const group of chunk(titles, 20)) {
    const response = await api(lang, {
      action: 'query',
      prop: 'pageimages',
      piprop: 'name|thumbnail',
      pithumbsize: 560,
      redirects: '1',
      titles: group.join('|'),
    });
    const resolve = resolver(response);
    for (const page of response.query?.pages || []) {
      if (page.missing !== undefined) continue;
      if (!page.pageimage || !page.thumbnail?.source) continue;
      if (!acceptable(page.pageimage)) continue;
      pages[lang].set(key(page.title), {
        file: page.pageimage,
        thumb: page.thumbnail.source,
        width: page.thumbnail.width,
        height: page.thumbnail.height,
        title: page.title,
        lang,
      });
    }
    await sleep(1600);
  }
}

const chosen = new Map();
for (const [id, list] of candidates) {
  for (const candidate of list) {
    const page = pages[candidate.lang].get(key(candidate.title));
    if (page && (page.width || 0) >= 320) {
      chosen.set(id, page);
      break;
    }
  }
}
console.log(`images candidates : ${chosen.size}/${events.length}`);

const fileEntries = [...chosen.entries()];
const commons = new Map();
for (const group of chunk(fileEntries, 25)) {
  const response = await api('commons', {
    action: 'query',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size',
    iiurlwidth: 560,
    titles: group.map(([, page]) => `File:${page.file}`).join('|'),
  });
  const resolve = resolver(response);
  for (const page of response.query?.pages || []) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const metadata = info.extmetadata || {};
    commons.set(key(page.title), {
      url: info.thumburl || info.url,
      width: info.width,
      height: info.height,
      license: stripHtml(metadata.LicenseShortName?.value),
      licenseUrl: metadata.LicenseUrl?.value || null,
      artist: stripHtml(metadata.Artist?.value) || stripHtml(metadata.Credit?.value) || 'Wikimedia Commons',
      description: stripHtml(metadata.ImageDescription?.value),
    });
  }
  await sleep(700);
}

const curated = JSON.parse(fs.readFileSync(path.join(ROOT, 'images', 'event-images.curation.json'), 'utf8'));
const output = {};
const rows = [];
const failures = [];
const outDir = path.join(ROOT, 'images', 'wiki');
fs.mkdirSync(outDir, { recursive: true });

async function download(url, destination) {
  const response = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 3000) throw new Error('fichier trop petit');
  fs.writeFileSync(destination, buffer);
}

const queue = [];
for (const [id, page] of fileEntries) {
  if (curated.some((entry) => entry.eventId === id)) continue;
  const info = commons.get(key(`File:${page.file}`)) || commons.get(key(page.file));
  if (!info) {
    failures.push({ id, reason: 'métadonnées Commons introuvables' });
    continue;
  }
  if ((info.width || 0) < 320 || (info.height || 0) < 200) {
    failures.push({ id, reason: 'image trop petite' });
    continue;
  }
  queue.push({ id, page, info });
}

const workers = Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const job = queue.shift();
    if (!job) return;
    const extension = (job.info.url.split('?')[0].match(/\.(jpe?g|png|webp)$/i) || ['.jpg'])[0];
    const filename = `${job.id}${extension}`;
    try {
      await download(job.info.url, path.join(outDir, filename));
      const description = job.info.description || job.page.file.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
      output[job.id] = {
        src: `images/wiki/${filename}`,
        alt: description.slice(0, 180),
        caption: description.slice(0, 150),
        credit: job.info.artist,
        license: job.info.license || 'voir la page source',
        licenseUrl: job.info.licenseUrl,
        source: `https://commons.wikimedia.org/wiki/File:${job.page.file.replace(/ /g, '_')}`,
        origin: `https://${job.page.lang}.wikipedia.org/wiki/${encodeURIComponent(job.page.title.replace(/ /g, '_'))}`,
        file: job.page.file,
        kind: 'wiki',
      };
      rows.push(`| \`${job.id}\` | ${job.page.file} | ${job.info.artist} | ${job.info.license || '—'} | ${job.page.lang} |`);
    } catch (error) {
      failures.push({ id: job.id, reason: error.message });
    }
  }
});
await Promise.all(workers);

// Fusion avec les entrées curatées déjà générées.
const existing = {};
const currentPath = path.join(ROOT, 'event-images.js');
if (fs.existsSync(currentPath)) {
  try {
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(currentPath, 'utf8'), context);
    Object.assign(existing, context.window.VECTEMPOREL_EVENT_IMAGES || {});
  } catch { /* fichier absent ou invalide */ }
}
for (const [id, value] of Object.entries(output)) {
  if (value) existing[id] = value;
}

const js = `/* Généré par scripts/fetch-wiki-images.mjs et build-event-images.mjs.
 * Images vérifiées via les API Wikipedia et Wikimedia Commons.
 * ${new Date().toISOString().slice(0, 10)}
 */
window.VECTEMPOREL_EVENT_IMAGES = ${JSON.stringify(existing, null, 2)};
`;
fs.writeFileSync(path.join(ROOT, 'event-images.js'), js, 'utf8');

const report = `# Images trouvées automatiquement

> Généré par \`npm run build:images:all\`. ${new Date().toISOString().slice(0, 10)}.

Méthode : pageimages sur fr/en.wikipedia à partir du slug Grokipedia et du titre
français, puis imageinfo sur Wikimedia Commons pour le crédit et la licence.
Les fichiers SVG, drapeaux, cartes, logos et icônes sont écartés.

- Repères avec une image vérifiée : **${Object.keys(existing).length}/${events.length}**
- Images ajoutées par cette passe : **${rows.length}**
- Échecs : **${failures.length}**

| Repère | Fichier Commons | Crédit | Licence | Wikipédia |
| --- | --- | --- | --- | --- |
${rows.join('\n')}

${failures.length ? `## Échecs\n\n| Repère | Raison |\n| --- | --- |\n${failures.map((f) => `| \`${f.id}\` | ${f.reason} |`).join('\n')}\n` : ''}
Les entrées curatées de \`EVENT_IMAGES.md\` gardent la priorité. Les repères sans
image vérifiée utilisent un motif génératif signalé « non documentaire ».
`;
fs.writeFileSync(path.join(ROOT, 'WIKI_IMAGES.md'), report, 'utf8');
console.log(`event-images.js : ${Object.keys(existing).length}/${events.length} repères illustrés.`);
if (failures.length) console.log(`${failures.length} échecs (voir WIKI_IMAGES.md).`);
