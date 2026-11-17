#!/usr/bin/env node
/* Remplace les images signalées comme inadaptées par des fichiers choisis
 * et vérifiés via l'API Wikimedia Commons. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const UA = 'Vectemporel/0.2 (prototype pédagogique local)';
const overrides = JSON.parse(fs.readFileSync(path.join(ROOT, 'images', 'curated-overrides.json'), 'utf8'));
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'event-images.js'), 'utf8'), context);
const images = context.window.VECTEMPOREL_EVENT_IMAGES;
const strip = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

for (const [id, entry] of Object.entries(overrides)) {
  const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', prop: 'imageinfo',
    iiprop: 'url|extmetadata|size', iiurlwidth: '520', titles: entry.file,
  })}`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    const page = (await response.json()).query?.pages?.find((item) => item.imageinfo?.[0]);
    if (!page) { console.warn(`✗ ${id} introuvable`); continue; }
    const info = page.imageinfo[0];
    if (!info.thumburl || !/\.(jpe?g|png|webp)/i.test(info.thumburl)) continue;
    const data = await fetch(info.thumburl, { headers: { 'User-Agent': UA } });
    if (!data.ok) continue;
    const directory = path.join(ROOT, 'images', 'events');
    fs.mkdirSync(directory, { recursive: true });
    const destination = path.join(directory, `${id}.jpg`);
    fs.writeFileSync(destination, Buffer.from(await data.arrayBuffer()));
    const metadata = info.extmetadata || {};
    images[id] = {
      src: `images/events/${id}.jpg`,
      alt: entry.alt,
      caption: entry.caption,
      credit: strip(metadata.Artist?.value) || 'Wikimedia Commons',
      license: strip(metadata.LicenseShortName?.value) || 'voir la page source',
      licenseUrl: metadata.LicenseUrl?.value || null,
      source: `https://commons.wikimedia.org/wiki/${entry.file.replace(/^File:/, '').replaceAll(' ', '_')}`,
      file: entry.file,
      kind: 'curated',
    };
    console.log(`✓ ${id}`);
  } catch (error) {
    console.warn(`✗ ${id}: ${error.message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 1200));
}
fs.writeFileSync(path.join(ROOT, 'event-images.js'), `/* Images vérifiées — généré par le pipeline d'images.\n * ${new Date().toISOString().slice(0, 10)}\n */\nwindow.VECTEMPOREL_EVENT_IMAGES = ${JSON.stringify(images, null, 2)};\n`);
console.log(`${Object.keys(images).length} images dans event-images.js.`);
