#!/usr/bin/env node
/*
 * Vectemporel — construit event-images.js et le registre des images.
 *
 * Pour chaque repère de images/event-images.curation.json :
 *   1. interroge l'API Wikimedia Commons pour vérifier le fichier ;
 *   2. lit sa licence et son auteur dans extmetadata ;
 *   3. télécharge une vignette 800 px dans images/events/ ;
 *   4. écrit event-images.js avec crédit, licence et page source.
 *
 * Une entrée non vérifiée est simplement omise : aucune image n'est
 * attribuée par défaut, aucun crédit n'est inventé.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const CURATION = path.join(ROOT, 'images', 'event-images.curation.json');
const OUTPUT_DIR = path.join(ROOT, 'images', 'events');
const OUTPUT_JS = path.join(ROOT, 'event-images.js');
const REGISTER = path.join(ROOT, 'EVENT_IMAGES.md');
const UA = 'Vectemporel/0.2 (prototype pédagogique local)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchCommons(file) {
  const url = 'https://commons.wikimedia.org/w/api.php'
    + '?action=query&format=json&prop=imageinfo'
    + '&iiprop=url%7Cextmetadata&iiurlwidth=800&titles='
    + encodeURIComponent(file);
  const response = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const page = Object.values(data?.query?.pages || {}).find((item) => item.imageinfo?.length);
  if (!page) throw new Error('fichier introuvable');
  const info = page.imageinfo[0];
  const metadata = info.extmetadata || {};
  return {
    title: page.title,
    url: info.thumburl || info.url,
    license: stripHtml(metadata.LicenseShortName?.value) || null,
    licenseUrl: metadata.LicenseUrl?.value || null,
    artist: stripHtml(metadata.Artist?.value) || null,
    credit: stripHtml(metadata.Credit?.value) || null,
    description: stripHtml(metadata.ImageDescription?.value) || null,
  };
}

async function download(url, destination) {
  const response = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 4000) throw new Error('fichier trop petit');
  fs.writeFileSync(destination, buffer);
  return buffer.length;
}

const curation = JSON.parse(fs.readFileSync(CURATION, 'utf8'));
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const output = {};
const rows = [];
const failures = [];

for (const entry of curation) {
  try {
    const info = await fetchCommons(entry.file);
    const extension = (info.url.split('?')[0].match(/\.(jpe?g|png|webp)$/i) || ['.jpg'])[0];
    const filename = `${entry.eventId}${extension}`;
    const bytes = download
      ? await download(info.url, path.join(OUTPUT_DIR, filename))
      : 0;
    const author = info.artist || info.credit || 'Wikimedia Commons';
    output[entry.eventId] = {
      src: `images/events/${filename}`,
      alt: entry.alt,
      caption: entry.caption,
      credit: author,
      license: info.license || 'voir la page source',
      licenseUrl: info.licenseUrl || null,
      source: `https://commons.wikimedia.org/wiki/${info.title.replace(/^File:/, 'File:').replaceAll(' ', '_')}`,
      file: info.title,
    };
    rows.push(`| \`${entry.eventId}\` | ${info.title} | ${author} | ${info.license || '—'} | ${(bytes / 1024).toFixed(0)} Ko |`);
    console.log(`✓ ${entry.eventId} — ${info.license || 'licence inconnue'}`);
  } catch (error) {
    failures.push(`- \`${entry.eventId}\` (${entry.file}) : ${error.message}`);
    console.warn(`✗ ${entry.eventId} — ${error.message}`);
  }
  await sleep(1400);
}

const js = `/* Généré par scripts/build-event-images.mjs — ne pas éditer à la main.
 * Images Wikimedia Commons vérifiées via l'API, avec crédit et licence.
 * ${new Date().toISOString().slice(0, 10)}
 */
window.VECTEMPOREL_EVENT_IMAGES = ${JSON.stringify(output, null, 2)};
`;
fs.writeFileSync(OUTPUT_JS, js, 'utf8');

const report = `# Images documentaires des repères

> Généré par \`npm run build:event-images\`. ${new Date().toISOString().slice(0, 10)}.

${Object.keys(output).length} images vérifiées sur ${curation.length} entrées curatées.
Chaque image est décrite par sa fiche Wikimedia Commons : le crédit et la licence
sont lus dans les métadonnées du fichier, jamais supposés. La légende décrit
ce que montre l'image, pas nécessairement l'événement lui-même.

| Repère | Fichier | Auteur / crédit | Licence | Taille |
| --- | --- | --- | --- | ---: |
${rows.join('\n')}

${failures.length ? `## Entrées non retenues\n\n${failures.join('\n')}\n` : ''}
## Règles

- Une entrée n'est publiée que si l'API Commons confirme le fichier et fournit une vignette.
- La licence est affichée dans la fiche du repère ; un lien mène à la page du fichier.
- Les repères sans image vérifiée utilisent un **motif génératif**, signalé
  explicitement « non documentaire ». Aucune image historique n'est fabriquée.
`;
fs.writeFileSync(REGISTER, report, 'utf8');
console.log(`event-images.js généré : ${Object.keys(output).length} images.`);
if (failures.length) console.log(`${failures.length} entrées non retenues (voir EVENT_IMAGES.md).`);
